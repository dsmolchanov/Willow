// supabase/functions/create_elevenlabs_agent/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions for better code organization and validation
interface RequestBody {
  scenario_id: number;
  language: string;
  title: string;
  description: string;
  prompt: string;
  first_message: string;
  voice_id: string | null;
  skill_ids: number[];
}

interface Skill {
  name: string;
  eval_prompt: string;
}

interface AgentResponse {
  agent_id: string;
  [key: string]: any;
}

// Configuration constants
const CONFIG = {
  ELEVENLABS_API: {
    CREATE_AGENT_URL: "https://api.elevenlabs.io/v1/convai/agents/create",
    TIMEOUT: 60000, // 60 seconds
    MAX_RETRIES: 5,
    BACKOFF_FACTOR: 2,
  },
  DEFAULT_VOICE_ID: "21m00Tcm4TlvDq8ikWAM",
  MAX_PROMPT_LENGTH: 800,
} as const;

// Initialize Supabase client with error handling
const initSupabaseClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!url || !key) {
    throw new Error("Missing required environment variables for Supabase client");
  }
  
  return createClient(url, key);
};

// Logging utility for consistent log format
const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      message,
      data
    }));
  },
  error: (message: string, error: any) => {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    }));
  }
};

/**
 * Updates the scenario status in the database
 */
async function updateScenarioStatus(
  supabase: any,
  scenarioId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorDetails: any = null
) {
  try {
    // Get current timezone offset
    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const hours = Math.floor(Math.abs(tzOffset) / 60);
    const minutes = Math.abs(tzOffset) % 60;
    const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const timestamp = now.toISOString().slice(0, 19) + tzString;

    // Prepare update data
    const updateData: any = {
      agent_status: status,
      updated_at: timestamp
    };

    // Only include error_details if provided and status is 'failed'
    if (status === 'failed' && errorDetails) {
      updateData.error_details = errorDetails;
    }

    const { error } = await supabase
      .from('scenarios')
      .update(updateData)
      .eq('scenario_id', scenarioId);

    if (error) throw error;
    
    logger.info(`Updated scenario ${scenarioId} status to ${status}`);
  } catch (error) {
    logger.error(`Failed to update scenario ${scenarioId} status`, error);
    throw error;
  }
}

/**
 * Fetches evaluation criteria from the skills table
 */
async function fetchCriteria(supabase: any, skillIds: number[]): Promise<{ name: string; prompt: string }[]> {
  try {
    const { data, error } = await supabase
      .from("skills")
      .select("name, eval_prompt")
      .in("skill_id", skillIds);

    if (error) throw error;
    if (!data || !data.length) {
      logger.info(`No criteria found for skill IDs: ${skillIds.join(', ')}`);
      return [];
    }

    return data.map((skill: Skill) => ({
      name: skill.name,
      prompt: skill.eval_prompt,
    }));
  } catch (error) {
    logger.error("Error fetching criteria", error);
    throw new Error(`Failed to fetch criteria: ${error.message}`);
  }
}

/**
 * Creates an agent in ElevenLabs with retry logic
 */
async function createAgent(config: any): Promise<string> {
  const headers = {
    "Content-Type": "application/json",
    "xi-api-key": Deno.env.get("XI_API_KEY")!,
  };

  for (let attempt = 1; attempt <= CONFIG.ELEVENLABS_API.MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        CONFIG.ELEVENLABS_API.TIMEOUT
      );

      const response = await fetch(CONFIG.ELEVENLABS_API.CREATE_AGENT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(config),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: AgentResponse = await response.json();
        logger.info("Successfully created agent", { agent_id: data.agent_id });
        return data.agent_id;
      }

      const errorText = await response.text();
      logger.error(`Failed to create agent on attempt ${attempt}`, {
        status: response.status,
        response: errorText
      });

      if (response.status >= 500 && attempt < CONFIG.ELEVENLABS_API.MAX_RETRIES) {
        const waitTime = CONFIG.ELEVENLABS_API.BACKOFF_FACTOR ** attempt * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`Failed to create agent: ${errorText}`);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${CONFIG.ELEVENLABS_API.TIMEOUT}ms`);
      }
      
      if (attempt === CONFIG.ELEVENLABS_API.MAX_RETRIES) {
        throw error;
      }

      const waitTime = CONFIG.ELEVENLABS_API.BACKOFF_FACTOR ** attempt * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error("Failed to create agent after all retries");
}

/**
 * Updates the scenario with the created agent ID and sets status to completed
 */
async function updateScenarioAgentId(supabase: any, scenarioId: number, agentId: string) {
  try {
    // Get current timezone offset
    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const hours = Math.floor(Math.abs(tzOffset) / 60);
    const minutes = Math.abs(tzOffset) % 60;
    const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Format timestamp with timezone
    const timestamp = now.toISOString().slice(0, 19) + tzString;

    const { error } = await supabase
      .from("scenarios")
      .update({ 
        agent_id: agentId,
        agent_status: 'completed',
        updated_at: timestamp
      })
      .eq("scenario_id", scenarioId);

    if (error) throw error;
    
    logger.info(`Updated scenario ${scenarioId} with agent ID ${agentId} and status completed`);
  } catch (error) {
    logger.error(`Failed to update scenario ${scenarioId} with agent ID`, error);
    throw error;
  }
}

/**
 * Constructs the conversation configuration for ElevenLabs
 */
function constructConversationConfig(
  name: string,
  prompt: string,
  firstMessage: string,
  language: string,
  criteria: { name: string; prompt: string }[],
  voiceId: string | null
): any {
  return {
    conversation_config: {
      name,
      agent: {
        prompt: {
          prompt,
          llm: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 1500,
          tools: [],
          knowledge_base: []
        },
        first_message: firstMessage,
        language,
        timeout: 30,
        num_retries: 3,
        error_message: language === 'ru' 
          ? "Извините, что-то пошло не так. Пожалуйста, попробуйте позже."
          : "Sorry, something went wrong. Please try again later."
      },
      asr: {
        quality: "high",
        provider: "elevenlabs",
        user_input_audio_format: "pcm_16000"
      },
      tts: {
        model_id: "eleven_turbo_v2_5",
        voice_id: voiceId || CONFIG.DEFAULT_VOICE_ID,
        optimize_streaming_latency: 0,
        stability: 0.5,
        similarity_boost: 0.75,
        agent_output_audio_format: "pcm_16000"
      }
    },
    platform_settings: {
      auth: {
        enable_auth: false
      },
      evaluation: {
        criteria: criteria.map((c, index) => ({
          id: `criterion_${index + 1}`,
          name: c.name,
          type: "prompt",
          conversation_goal_prompt: (c.prompt || "").substring(0, CONFIG.MAX_PROMPT_LENGTH)
        }))
      }
    }
  };
}

/**
 * Validates the request body
 */
function validateRequest(body: any): RequestBody {
  const requiredFields = [
    'scenario_id',
    'language',
    'title',
    'prompt',
    'first_message',
    'skill_ids'
  ];

  for (const field of requiredFields) {
    if (!(field in body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(body.skill_ids) || body.skill_ids.length === 0) {
    throw new Error("skill_ids must be a non-empty array");
  }

  return body as RequestBody;
}

/**
 * Main processing function for agent creation
 */
async function processAgentCreation(supabase: any, requestBody: RequestBody) {
  const {
    scenario_id,
    language,
    title,
    prompt,
    first_message,
    voice_id,
    skill_ids
  } = requestBody;

  try {
    await updateScenarioStatus(supabase, scenario_id, 'processing');

    const criteria = await fetchCriteria(supabase, skill_ids);
    
    const conversationConfig = constructConversationConfig(
      title,
      prompt,
      first_message,
      language,
      criteria,
      voice_id
    );

    const agentId = await createAgent(conversationConfig);
    await updateScenarioAgentId(supabase, scenario_id, agentId);

    return { 
      success: true,
      agent_id: agentId 
    };
  } catch (error) {
    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const hours = Math.floor(Math.abs(tzOffset) / 60);
    const minutes = Math.abs(tzOffset) % 60;
    const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const timestamp = now.toISOString().slice(0, 19) + tzString;

    await updateScenarioStatus(supabase, scenario_id, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: timestamp
    });
    throw error;
  }
}

// Main serve function
serve(async (req: Request) => {
  const supabase = initSupabaseClient();
  
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const requestBody = validateRequest(await req.json());

    // Set initial status
    await updateScenarioStatus(supabase, requestBody.scenario_id, 'processing');

    // Start agent creation in background
    processAgentCreation(supabase, requestBody).catch(error => {
      logger.error("Background processing failed", error);
    });

    // Return immediate response with scenario_id
    return new Response(
      JSON.stringify({ 
        success: true,
        scenario_id: requestBody.scenario_id,
        agent_status: 'processing',
        message: 'Agent creation started'
      }),
      {
        status: 202,
        headers: { 
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    logger.error("Request processing failed", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        scenario_id: requestBody?.scenario_id,
        agent_status: 'failed'
      }),
      {
        status: error instanceof Error && error.message.includes("Missing required field") ? 400 : 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
// supabase/functions/create_elevenlabs_agent/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// ElevenLabs API Endpoint
const ELEVENLABS_CREATE_AGENT_URL = "https://api.elevenlabs.io/v1/convai/agents/create";

// Configuration for retries
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 2;

/**
 * Fetch a scenario by ID from Supabase
 */
async function fetchScenario(scenarioId: string) {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("scenario_id", scenarioId)
    .single();

  if (error) {
    throw new Error(`Error fetching scenario: ${error.message}`);
  }

  return data;
}

/**
 * Fetch related skills and create criteria array
 */
async function fetchCriteria(skillIds: string[]): Promise<{ name: string; prompt: string }[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("name, eval_prompt")
    .in("skill_id", skillIds);

  if (error) {
    throw new Error(`Error fetching skills: ${error.message}`);
  }

  // Create criteria array
  const criteriaArray = data.map((skill: any) => ({
    name: skill.name,
    prompt: skill.eval_prompt,
  }));

  return criteriaArray;
}

/**
 * Create an agent in ElevenLabs
 */
async function createAgent(conversationConfig: any) {
  const headers = {
    "Content-Type": "application/json",
    "xi-api-key": Deno.env.get("XI_API_KEY")!,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(ELEVENLABS_CREATE_AGENT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(conversationConfig)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Successfully created agent:", responseData);
        return responseData.agent_id;
      } else {
        const errorText = await response.text();
        console.error(`Failed to create agent. Status: ${response.status}, Response: ${errorText}`);

        if (response.status >= 500 && response.status < 600) {
          // Server error, retry
          const waitTime = BACKOFF_FACTOR ** attempt;
          console.log(`Server error. Retrying in ${waitTime} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        } else {
          // Client error, do not retry
          throw new Error(`Client error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempt} - Error creating agent: ${error}`);
      if (attempt < MAX_RETRIES) {
        const waitTime = BACKOFF_FACTOR ** attempt;
        console.log(`Retrying in ${waitTime} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      } else {
        throw new Error("Max retries exceeded. Failed to create agent.");
      }
    }
  }

  throw new Error("Failed to create agent after retries.");
}

/**
 * Update scenario with agent_id
 */
async function updateScenarioAgentId(scenarioId: string, agentId: string) {
  const { error } = await supabase
    .from("scenarios")
    .update({ agent_id: agentId })
    .eq("scenario_id", scenarioId);

  if (error) {
    throw new Error(`Error updating scenario with agent_id: ${error.message}`);
  }

  return true;
}

/**
 * Construct conversation_config based on scenario data and input parameters
 */
function constructConversationConfig(
  name: string,
  prompt: string,
  firstMessage: string,
  language: string,
  criteria: { name: string; prompt: string }[],
  voice_id: string | null
): any {
  return {
    conversation_config: {
      name: name,
      agent: {
        prompt: {
          prompt: prompt,
          llm: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 1500,
          tools: [],
          knowledge_base: []
        },
        first_message: firstMessage,
        language: language,
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
        voice_id: voice_id || "21m00Tcm4TlvDq8ikWAM",  // Use provided voice_id or default
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
          conversation_goal_prompt: c.prompt.substring(0, 800)
        }))
      }
    }
  };
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { scenario_id, language } = await req.json();

    if (!scenario_id) {
      return new Response("Missing 'scenario_id' in request body.", { status: 400 });
    }

    if (!language) {
      return new Response("Missing 'language' in request body.", { status: 400 });
    }

    // Fetch scenario data
    const scenario = await fetchScenario(scenario_id);
    if (!scenario) {
      return new Response("Scenario not found.", { status: 404 });
    }

    const name: string = scenario.title || scenario.description;
    const prompt: string = scenario.prompt;
    const firstMessage: string = scenario.first_message;
    const voice_id: string | null = scenario.voice_id;  // Get voice_id from scenario

    if (!name || !prompt || !firstMessage) {
      return new Response("Scenario title, prompt, or first_message is missing.", { status: 400 });
    }

    // Fetch related skills and create criteria array
    const skillIds: string[] = scenario.skill_ids || [];
    if (skillIds.length === 0) {
      return new Response("No associated skills found for this scenario.", { status: 400 });
    }

    const criteria = await fetchCriteria(skillIds);
    if (criteria.length === 0) {
      console.warn("No criteria found for the associated skills.");
    }

    // Construct conversation_config with voice_id
    const conversationConfig = constructConversationConfig(
      name,
      prompt,
      firstMessage,
      language,
      criteria,
      voice_id  // Pass voice_id to config
    );

    // Create ElevenLabs agent
    const agentId = await createAgent(conversationConfig);
    if (!agentId) {
      return new Response("Failed to create ElevenLabs agent.", { status: 500 });
    }

    // Update scenario with agent_id
    await updateScenarioAgentId(scenario_id, agentId);

    // Respond with success
    return new Response(
      JSON.stringify({
        message: "Conversational agent created and scenario updated successfully.",
        agent_id: agentId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error(`Error in create_elevenlabs_agent: ${error.message}`);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
});

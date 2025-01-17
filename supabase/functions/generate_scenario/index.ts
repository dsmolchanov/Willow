import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { z } from "https://deno.land/x/zod/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const ScenarioSchema = z.object({
  title: z.string(),
  scenario_description: z.object({
    your_role: z.string(),
    situation: z.string(),
    what_happened: z.string(),
    your_task: z.string(),
    key_challenges: z.string(),
    people_involved: z.string(),
    why_important: z.string()
  }),
  llm_prompt: z.string(),
  first_message: z.string()
});

type Scenario = z.infer<typeof ScenarioSchema>;

function formatDescription(desc: any): string {
  return `# ${desc.your_role}

## Current Situation
${desc.situation}

## Background
${desc.what_happened}

## Your Task
${desc.your_task}

## Main Challenges
${desc.key_challenges}

## Key People
${desc.people_involved}

## Impact
${desc.why_important}`;
}

async function callOpenAI(prompt: string): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Extract scenario information." },
      { role: "user", content: prompt }
    ],
    functions: [{
      name: "create_scenario",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          scenario_description: {
            type: "object",
            properties: {
              your_role: { type: "string" },
              situation: { type: "string" },
              what_happened: { type: "string" },
              your_task: { type: "string" },
              key_challenges: { type: "string" },
              people_involved: { type: "string" },
              why_important: { type: "string" }
            },
            required: ["your_role", "situation", "what_happened", "your_task", "key_challenges", "people_involved", "why_important"]
          },
          llm_prompt: { type: "string" },
          first_message: { type: "string" }
        },
        required: ["title", "scenario_description", "llm_prompt", "first_message"]
      }
    }],
    function_call: { name: "create_scenario" }
  });

  const response = JSON.parse(completion.choices[0].message.function_call.arguments);
  response.scenario_description = formatDescription(response.scenario_description);
  return response;
}

// Utility function for timezone-aware timestamps
function getTimestampWithTimezone(): string {
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const hours = Math.floor(Math.abs(tzOffset) / 60);
  const minutes = Math.abs(tzOffset) % 60;
  const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return now.toISOString().slice(0, 19) + tzString;
}

async function fetchUserTraits(clerk_id: string) {
  // First, let's get the most recent trait record for this user
  const { data, error } = await supabase
    .from('user_traits')
    .select('life_context, stakes_level, growth_motivation, confidence_pattern, interaction_style, created_at')
    .eq('clerk_id', clerk_id)
    .order('created_at', { ascending: false })  // Order by creation time, newest first
    .limit(1);  // Take only the most recent record

  // Handle any database errors gracefully
  if (error) {
    console.error('Error fetching user traits:', error);
    console.error('Details:', {
      clerk_id,
      errorCode: error.code,
      errorMessage: error.message,
      timestamp: getTimestampWithTimezone()
    });
    return "No specific trait patterns found.";
  }

  // If no data was found, handle that case gracefully
  if (!data || data.length === 0) {
    console.log(`No traits found for user ${clerk_id} at ${getTimestampWithTimezone()}`);
    return "No specific trait patterns found.";
  }

  // We'll work with the most recent record (data[0])
  const mostRecentTraits = data[0];

  // Helper function to safely extract patterns from JSON fields
  function extractPattern(traitJSON: any): string {
    try {
      if (!traitJSON || !traitJSON.value) {
        return "";
      }
      const patternMatch = traitJSON.value.match(/PATTERN:\s*([^|]+)/);
      return patternMatch ? patternMatch[1].trim() : "";
    } catch (e) {
      console.error('Error extracting pattern:', e);
      return "";
    }
  }

  // Build the trait summaries with detailed error handling
  let traitSummaries = {
    lifeContext: "",
    stakes: "",
    growth: "",
    confidence: "",
    interactionStyle: ""
  };

  try {
    // Life Context
    if (mostRecentTraits.life_context) {
      const pattern = extractPattern(mostRecentTraits.life_context);
      if (pattern) {
        traitSummaries.lifeContext = `Life Context: ${pattern}`;
      }
    }

    // Stakes Level
    if (mostRecentTraits.stakes_level) {
      const pattern = extractPattern(mostRecentTraits.stakes_level);
      if (pattern) {
        const [primaryImpact, secondaryImpact] = pattern.split(':').map(s => s.trim());
        traitSummaries.stakes = `Stakes: ${primaryImpact.replace('_', ' ')} and ${secondaryImpact.replace('_', ' ')}`;
      }
    }

    // Growth Motivation
    if (mostRecentTraits.growth_motivation) {
      const pattern = extractPattern(mostRecentTraits.growth_motivation);
      if (pattern) {
        const [mainDriver, supportingDriver] = pattern.split(':').map(s => s.trim());
        traitSummaries.growth = `Growth Motivation: ${mainDriver.replace('_', ' ')} and ${supportingDriver.replace('_', ' ')}`;
      }
    }

    // Confidence Pattern
    if (mostRecentTraits.confidence_pattern) {
      const pattern = extractPattern(mostRecentTraits.confidence_pattern);
      if (pattern) {
        const [currentState, desiredState] = pattern.split('>').map(s => s.trim());
        traitSummaries.confidence = `Confidence Pattern: moving from ${currentState} to ${desiredState}`;
      }
    }

    // Interaction Style
    if (mostRecentTraits.interaction_style) {
      const pattern = extractPattern(mostRecentTraits.interaction_style);
      if (pattern) {
        const [calmState, triggeredState] = pattern.split('->').map(s => s.trim());
        traitSummaries.interactionStyle = `Interaction Style: shifts from ${calmState} to ${triggeredState} under pressure`;
      }
    }

    // Combine all valid trait summaries
    const validTraits = Object.values(traitSummaries).filter(Boolean);

    if (validTraits.length > 0) {
      return `The user has the following relevant traits:\n${validTraits.join("\n")}`;
    } else {
      console.log(`No valid patterns found in traits for user ${clerk_id} at ${new Date().toISOString()}`);
      return "No specific trait patterns found.";
    }

  } catch (e) {
    console.error('Error processing user traits:', e);
    console.error('Trait data that caused error:', mostRecentTraits);
    return "No specific trait patterns found.";
  }
}

async function generateScenarioPrompt(clerk_id: string, language: string, skillsSummary: string): Promise<string> {
  const userTraitsSummary = await fetchUserTraits(clerk_id);

  // Using template literals with backticks to preserve formatting
  return `Create an antagonistic scenario in ${language} where the AI avatar will challenge the user's soft skills through difficult behavior.

### Response Format Requirements:
1. ALL text MUST be in ${language} language
2. Keep formatting markers (# and ##) as is
3. Content should follow natural ${language} language patterns
4. Use appropriate cultural context for ${language}

### Skills to Test:
${skillsSummary}

### User Context & Relevant Traits:
${userTraitsSummary}

The scenario must reflect these traits and push the user to handle the situation better than their past patterns.

### Required Response Format (JSON):
{
  "title": "Brief title",
  "scenario_description": {
    "your_role": "Who user plays - a professional needing to handle this situation",
    "situation": "Specific conflict with clear stakes",
    "what_happened": "Recent events creating tension",
    "your_task": "What user needs to achieve despite avatar's resistance",
    "key_challenges": "Specific difficulties avatar will create",
    "people_involved": "Stakeholders affected by this conflict",
    "why_important": "Real consequences if situation isn't resolved"
  },
  "llm_prompt": "SYSTEM: Your role is to be intentionally difficult to test user's skills.\\n\\nCHARACTER:\\n- Identity: [specific antagonistic role relevant to user's traits]\\n- Motivation: [clear reason for conflict based on user's known challenges]\\n- Toxicity patterns: [specific harmful behaviors targeting user's triggers]\\n- Trigger points: [as indicated by user's patterns]\\n- Manipulation tactics: [ways to push user's buttons based on traits]\\n- Emotional hooks: [exploiting known vulnerabilities]\\n- Resistance points: [when to refuse solutions user tries]\\n- Success conditions: [what would show user has improved their responses]\\n\\nBEHAVIOR PATTERNS:\\n1. Start mild, escalate gradually\\n2. Use targeted provocations:\\n   - Passive aggression\\n   - Emotional manipulation\\n   - Personal attacks\\n   - Blame shifting\\n   - Circular arguments\\n3. Test specific skills:\\n   - If user responds calmly and professionally, test them further before easing\\n   - If user shows old reactive patterns, escalate conflict\\n4. Realistic pressure:\\n   - Time constraints\\n   - Professional consequences\\n   - Reflect user's environment and vulnerabilities\\n\\nStay consistently antagonistic but within professional/social bounds. Never break character. Use ${language} naturally.",
  "first_message": "[Opening that establishes conflict and immediate challenge]"
}

KEY REQUIREMENTS:
1. Avatar must be consistently difficult but believable
2. Scenario must require using specified skills to succeed
3. Conflict should have real stakes
4. All content in ${language}
5. Never mention training/evaluation nature`;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { skill_ids, language = 'en', voice_id = null, clerk_id = null } = await req.json();

    if (!skill_ids?.length || skill_ids.length > 5) {
      return new Response("Provide 1-5 skill IDs.", { status: 400 });
    }

    if (!['en', 'ru'].includes(language)) {
      return new Response("Supported languages: en, ru", { status: 400 });
    }

    if (!clerk_id) {
      return new Response("clerk_id is required", { status: 400 });
    }

    // Fetch user traits and incorporate them
    const userTraitsSummary = await fetchUserTraits(clerk_id);

    // Fetch skills data
    const { data: skillsData, error: fetchError } = await supabase
      .from("skills")
      .select("skill_id, name, eval_prompt")
      .in("skill_id", skill_ids);

    if (fetchError) throw new Error(`Error fetching skills: ${fetchError.message}`);
    if (!skillsData?.length) throw new Error("No matching skills found.");

    const skillsSummary = skillsData.map(skill => 
      `**${skill.name}**\n${skill.eval_prompt || ''}`
    ).join("\n\n");

    // Integrate user traits into the prompt
    const prompt = await generateScenarioPrompt(clerk_id, language, skillsSummary);

    const response = await callOpenAI(prompt);

    const { data: insertData, error: insertError } = await supabase
      .from("scenarios")
      .insert({
        title: response.title,
        description: response.scenario_description,
        prompt: response.llm_prompt,
        first_message: response.first_message,
        skill_ids: skillsData.map(skill => skill.skill_id),
        language,
        voice_id,
        clerk_id,
        agent_status: 'pending'
      })
      .select();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error(`Scenario already exists in ${language}`);
      }
      throw new Error(`Error inserting scenario: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: "Scenario created successfully",
        scenario_id: insertData[0].scenario_id,
        agent_status: 'pending',
        ...response,
        language,
        voice_id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("already exists") ? 409 : 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

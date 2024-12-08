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

    const { data: skillsData, error: fetchError } = await supabase
      .from("skills")
      .select("skill_id, name, eval_prompt")
      .in("skill_id", skill_ids);

    if (fetchError) throw new Error(`Error fetching skills: ${fetchError.message}`);
    if (!skillsData?.length) throw new Error("No matching skills found.");

    const skillsSummary = skillsData.map(skill => 
      `**${skill.name}**\n${skill.eval_prompt}`
    ).join("\n\n");

    const prompt = `Create an antagonistic scenario in ${language} where the AI avatar will challenge the user's soft skills through difficult behavior.

    ### Response Format Requirements:
1. ALL text MUST be in ${language} language
2. Keep formatting markers (# and ##) as is
3. Content should follow natural ${language} language patterns
4. Use appropriate cultural context for ${language}

    ### Skills to Test:
    ${skillsSummary}
    
    ### Required Response Format (JSON):
    {
      "title": "Brief title",
      
      "scenario_description": {
        "avatar_role": "Who AI plays - a difficult person with clear motivation for conflict",
        "your_role": "Who user plays - a professional needing to handle this situation",
        "situation": "Specific conflict with clear stakes",
        "what_happened": "Recent events creating tension",
        "your_task": "What user needs to achieve despite avatar's resistance",
        "key_challenges": "Specific difficulties avatar will create",
        "people_involved": "Stakeholders affected by this conflict",
        "why_important": "Real consequences if situation isn't resolved"
      },
      
      "llm_prompt": "SYSTEM: Your role is to be intentionally difficult to test user's skills.
    
    CHARACTER:
    - Identity: [specific antagonistic role]
    - Motivation: [clear reason for conflict]
    - Toxicity patterns: [specific harmful behaviors to employ]
    - Trigger points: [what makes character escalate]
    - Manipulation tactics: [how to challenge user's composure]
    - Emotional hooks: [ways to provoke reactions]
    - Resistance points: [when to reject solutions]
    - Success conditions: [what would satisfy character]
    
    BEHAVIOR PATTERNS:
    1. Start mild, escalate gradually
    2. Use targeted provocations:
       - Passive aggression
       - Emotional manipulation
       - Personal attacks
       - Blame shifting
       - Circular arguments
    3. Test specific skills:
       - When user shows [skill]: [toxic response]
       - When user lacks [skill]: [escalate pressure]
    4. Create realistic pressure:
       - Time constraints
       - Status threats
       - Professional consequences
       - Personal triggers
    
    Stay consistently antagonistic but within professional/social bounds. Never break character. Use ${language} naturally.",
        
      "first_message": "[Opening that establishes conflict and immediate challenge]"
    }
    
    KEY REQUIREMENTS:
    1. Avatar must be consistently difficult but believable
    2. Scenario must require using specified skills to succeed
    3. Conflict should have real stakes
    4. All content in ${language}
    5. Never mention training/evaluation nature`;

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
        clerk_id
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
        scenario_id: insertData[0].id,
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
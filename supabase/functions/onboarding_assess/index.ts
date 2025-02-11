import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

interface SkillMapping {
  skill_id: number;
  importance: number;
  role?: string;                  // Might be useful for future expansions
  development_order?: number;     // Numeric
  indicators?: string[];          // Additional data
  practice_areas?: string[];      // Additional data
  constraints?: any;              // Prerequisites, dev path, etc.
  skills?: { is_active: boolean };
}

interface TraitPattern {
  trait_skill_mappings: SkillMapping[];
}

interface InitialCalculationParams {
  clerk_id: string;
  data_collection_results: any;
  traitMappings: TraitPattern[];
}

async function handleInitialCalculation({ clerk_id, data_collection_results, traitMappings }: InitialCalculationParams) {
  console.log('Starting initial calculation for clerk_id:', clerk_id);

  // Calculate initial weights (core logic below)
  const weights = calculateInitialWeights(data_collection_results, traitMappings);
  console.log('Calculated weights:', weights);

  // Insert initial user traits
  const { error: traitsError } = await supabase
    .from('user_traits')
    .insert({
      clerk_id,
      trait_values: data_collection_results,
      created_at: new Date().toISOString()
    });

  if (traitsError) {
    console.error('Error inserting user traits:', traitsError);
    throw traitsError;
  }

  // Insert initial skill weights
  const { error: weightsError } = await supabase
    .from('user_skill_weights')
    .insert({
      clerk_id,
      weights,
      created_at: new Date().toISOString()
    });

  if (weightsError) {
    console.error('Error inserting skill weights:', weightsError);
    throw weightsError;
  }

  // Generate initial learning path
  const learningPath = generateInitialLearningPath(weights);
  console.log('Generated learning path:', learningPath);

  return new Response(
    JSON.stringify({
      success: true,
      weights,
      learning_path: learningPath
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Aggregates skill importance across multiple patterns,
 * then applies dev order, prerequisites, etc. to generate
 * a final weight score for each skill.
 */
function calculateInitialWeights(results: any, traitMappings: TraitPattern[]) {
  // 1) Aggregate skill data (since the same skill might appear in multiple patterns)
  const skillMap: Record<
    number,
    {
      totalImportance: number;
      count: number;
      highestDevOrder: number;       // Keep track of the highest dev order found
      prerequisites: number[];       // Collect all prerequisites if any
      baseWeight: number;           // We'll assume a static base for now (1.0)
    }
  > = {};

  // Loop over each trait pattern
  for (const mapping of traitMappings) {
    for (const skillMapping of mapping.trait_skill_mappings) {
      // Skip inactive skills
      if (!skillMapping.skills?.is_active) continue;

      const id = skillMapping.skill_id;
      if (!skillMap[id]) {
        skillMap[id] = {
          totalImportance: 0,
          count: 0,
          highestDevOrder: 1,        // default
          prerequisites: [],
          baseWeight: 1.0
        };
      }

      skillMap[id].totalImportance += skillMapping.importance;
      skillMap[id].count += 1;

      // Track the "worst" or "highest" dev_order to ensure we consider the most advanced usage
      const devOrder = skillMapping.development_order || 1;
      if (devOrder > skillMap[id].highestDevOrder) {
        skillMap[id].highestDevOrder = devOrder;
      }

      // Collect prerequisites if any
      const prereqArr = skillMapping.constraints?.prerequisites ?? [];
      if (Array.isArray(prereqArr) && prereqArr.length > 0) {
        // Merge them into one array, ignoring duplicates
        const existing = new Set(skillMap[id].prerequisites);
        for (const p of prereqArr) {
          existing.add(p);
        }
        skillMap[id].prerequisites = [...existing];
      }
    }
  }

  // 2) Convert the aggregated data into final weight objects
  const weights = Object.entries(skillMap).map(([skillId, agg]) => {
    const skill_id = parseInt(skillId, 10);

    // --- a) Combine importance across multiple patterns
    const averageImportance = agg.totalImportance / agg.count;

    // --- b) Dev order factor (simple approach):
    // E.g., devOrder = 1 => factor=1.0, devOrder=2 => 0.95, devOrder=3 => 0.90, etc.
    // You can refine as needed.
    const devOrderFactor = Math.max(0.5, 1.0 - (agg.highestDevOrder - 1) * 0.05);

    // --- c) Prerequisite factor: if the skill has prerequisites, give a small penalty
    // Because user hasn't completed them yet (initial).
    const hasPrereqs = agg.prerequisites.length > 0;
    const prereqFactor = hasPrereqs ? 0.8 : 1.0; // You can adjust this penalty as needed.

    // --- d) Final Weighted Score
    const finalScore = agg.baseWeight * averageImportance * devOrderFactor * prereqFactor;

    // Return the data in the format your system expects
    return {
      skill_id,
      weight_data: {
        base_weight: agg.baseWeight,
        importance_factor: averageImportance,
        dev_order_factor: devOrderFactor,
        prereq_factor: prereqFactor,
        final_score: finalScore, // Not strictly required, but helpful for debugging
        development_stage: {
          current: 'initial',
          target: 'developing',
          readiness: 0.5
        }
      }
    };
  });

  return weights;
}

/**
 * Sorts by the final score (or base_weight * importance_factor if you prefer).
 * This version specifically uses `weight_data.final_score`.
 */
function generateInitialLearningPath(weights: any[]) {
  // 1) Sort by the final_score in descending order
  const sortedSkills = weights
    .sort((a, b) => b.weight_data.final_score - a.weight_data.final_score)
    .map(w => ({
      skill_id: w.skill_id,
      priority: w.weight_data.final_score,
      development_stage: w.weight_data.development_stage
    }));

  // 2) Return top 5 as initial focus
  return sortedSkills.slice(0, 5);
}

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log('Received payload:', payload);

    const { clerk_id, elevenlabs_conversation_id } = payload;
    console.log('Processing initial assessment for clerk_id:', clerk_id, 'conversation_id:', elevenlabs_conversation_id);

    if (!clerk_id || !elevenlabs_conversation_id) {
      throw new Error('Clerk ID and Conversation ID are required');
    }

    // Get conversation data with analysis
    const { data: conversation, error: convError } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('elevenlabs_conversation_id', elevenlabs_conversation_id)
      .single();
        
    if (convError) {
      console.error('Error fetching conversation:', convError);
      throw convError;
    }

    // Get trait mappings for initial calculation with active skills only
    const { data: traitMappings, error: mappingsError } = await supabase
      .from('trait_patterns')
      .select(`
        *,
        trait_skill_mappings!inner(
          skill_id,
          importance,
          role,
          development_order,
          indicators,
          practice_areas,
          constraints,
          skills!inner(
            skill_id,
            is_active
          )
        ),
        trait_development_stages!inner(
          skill_id,
          stage_from,
          stage_to,
          readiness_score,
          prerequisites,
          learning_focus
        )
      `)
      .eq('trait_skill_mappings.skills.is_active', true);

    if (mappingsError) {
      console.error('Error fetching trait mappings:', mappingsError);
      throw mappingsError;
    }

    // Filter out any remaining inactive skills
    const filteredMappings = traitMappings?.map(mapping => ({
      ...mapping,
      trait_skill_mappings: mapping.trait_skill_mappings.filter(
        skillMapping => skillMapping.skills?.is_active
      )
    }));

    console.log('Active skills count:', filteredMappings?.reduce(
      (sum, mapping) => sum + (mapping.trait_skill_mappings?.length || 0), 
      0
    ));

    if (!conversation?.analysis) {
      console.error('No analysis found in conversation');
      throw new Error('No analysis found in conversation data');
    }

    // Calculate initial weights and learning path
    const result = await handleInitialCalculation({
      clerk_id,
      data_collection_results: conversation.analysis,
      traitMappings: filteredMappings
    });

    console.log('Initial assessment completed');
    return result;

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
});

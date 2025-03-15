import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

interface SkillEvaluation {
  skill_id: number;
  result: 'success' | 'failure';
  rationale: string;
}

interface LessonAnalysis {
  evaluation_criteria_results: Record<string, {
    result: 'success' | 'failure';
    rationale: string;
    criteria_id: string;
  }>;
}

async function handleLessonAssessment(clerk_id: string, conversation_id: string, analysis: LessonAnalysis) {
  console.log('Processing lesson assessment for clerk_id:', clerk_id);

  // Get scenario info to map criteria to skills
  const { data: conversation, error: convError } = await supabase
    .from('user_conversations')
    .select('scenario_info')
    .eq('elevenlabs_conversation_id', conversation_id)
    .single();

  if (convError) throw convError;

  const skillIds = conversation.scenario_info.skill_ids;
  
  // Map criteria results to skills
  const skillEvaluations: SkillEvaluation[] = Object.entries(analysis.evaluation_criteria_results)
    .map(([criterionKey, evaluation], index) => ({
      skill_id: skillIds[index],
      result: evaluation.result,
      rationale: evaluation.rationale
    }));

  console.log('Skill evaluations:', skillEvaluations);

  // Get current skill weights
  const { data: currentWeights, error: weightsError } = await supabase
    .from('user_skill_weights')
    .select('weights')
    .eq('clerk_id', clerk_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (weightsError) throw weightsError;

  // Update weights based on lesson results
  const updatedWeights = updateSkillWeights(currentWeights.weights, skillEvaluations);

  // Insert new weights
  const { error: insertError } = await supabase
    .from('user_skill_weights')
    .insert({
      clerk_id,
      weights: updatedWeights,
      created_at: new Date().toISOString()
    });

  if (insertError) throw insertError;

  // Generate new learning path
  const learningPath = generateUpdatedLearningPath(updatedWeights);

  // Update user_learning_paths
  const { error: pathError } = await supabase
    .from('user_learning_paths')
    .upsert({
      clerk_id,
      path: learningPath,
      updated_at: new Date().toISOString()
    });

  if (pathError) throw pathError;

  return new Response(
    JSON.stringify({
      success: true,
      updated_weights: updatedWeights,
      learning_path: learningPath
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

function updateSkillWeights(currentWeights: any[], skillEvaluations: SkillEvaluation[]) {
  return currentWeights.map(weight => {
    const evaluation = skillEvaluations.find(skillEval => skillEval.skill_id === weight.skill_id);
    if (!evaluation) return weight;

    const currentScore = weight.weight_data.final_score;
    const adjustmentFactor = evaluation.result === 'success' ? 0.8 : 1.2;
    
    return {
      ...weight,
      weight_data: {
        ...weight.weight_data,
        final_score: currentScore * adjustmentFactor,
        development_stage: {
          current: evaluation.result === 'success' ? 'developing' : 'struggling',
          target: 'mastering',
          readiness: evaluation.result === 'success' ? 0.8 : 0.4
        },
        last_evaluation: {
          result: evaluation.result,
          rationale: evaluation.rationale
        }
      }
    };
  });
}

function generateUpdatedLearningPath(weights: any[]) {
  return weights
    .sort((a, b) => b.weight_data.final_score - a.weight_data.final_score)
    .slice(0, 5)
    .map(w => ({
      skill_id: w.skill_id,
      priority: w.weight_data.final_score,
      development_stage: w.weight_data.development_stage
    }));
}

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log('Received payload:', payload);

    const { clerk_id, elevenlabs_conversation_id } = payload;
    console.log('Processing lesson for clerk_id:', clerk_id, 'conversation_id:', elevenlabs_conversation_id);

    if (!clerk_id || !elevenlabs_conversation_id) {
      throw new Error('Clerk ID and Conversation ID are required');
    }

    // Get conversation analysis
    const { data: conversation, error: convError } = await supabase
      .from('user_conversations')
      .select('analysis')
      .eq('elevenlabs_conversation_id', elevenlabs_conversation_id)
      .single();
        
    if (convError || !conversation?.analysis) {
      console.error('Error fetching conversation:', convError);
      throw convError || new Error('No analysis found');
    }

    const result = await handleLessonAssessment(
      clerk_id,
      elevenlabs_conversation_id,
      conversation.analysis
    );

    console.log('Lesson assessment completed');
    return result;

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

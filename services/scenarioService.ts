import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type UserScenario = Database['public']['Tables']['user_scenarios']['Row'];
type UserConversation = Database['public']['Tables']['user_conversations']['Row'];

interface SkillEvaluation {
  skill_id: number;
  result: 'success' | 'failure';
  rationale: string;
}

interface ConversationAnalysis {
  evaluation_criteria_results: Record<string, {
    result: 'success' | 'failure';
    rationale: string;
    criteria_id: string;
  }>;
}

interface ScenarioAssessment {
  score: number;
  feedback: string;
  practice_metrics: {
    success_rate: number;
    key_achievements: string[];
    challenge_areas: string[];
  };
}

export async function processCompletedScenario(
  supabase: SupabaseClient,
  clerkId: string,
  conversationId: string
): Promise<ScenarioAssessment | null> {
  try {
    // 1. Get the conversation data and analysis
    const { data: conversation, error: convError } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('elevenlabs_conversation_id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError);
      return null;
    }

    // 2. Get the user scenario related to this conversation
    const { data: userScenario, error: scenarioError } = await supabase
      .from('user_scenarios')
      .select('*')
      .eq('clerk_id', clerkId)
      .eq('skill_objectives->conversation_id', conversationId)
      .single();

    if (scenarioError || !userScenario) {
      console.error('Error fetching user scenario:', scenarioError);
      return null;
    }

    // 3. Process the analysis to generate assessment
    const analysis = conversation.analysis as ConversationAnalysis;
    if (!analysis || !analysis.evaluation_criteria_results) {
      console.error('No valid analysis found in conversation');
      return null;
    }

    // 4. Map criteria results to skills
    const skillIds = userScenario.skill_objectives?.skill_ids || [];
    const skillEvaluations: SkillEvaluation[] = Object.entries(analysis.evaluation_criteria_results)
      .map(([criterionKey, evaluation], index) => ({
        skill_id: skillIds[index] || 0,
        result: evaluation.result,
        rationale: evaluation.rationale
      }))
      .filter(item => item.skill_id !== 0);

    // 5. Calculate success rate
    const totalEvaluations = skillEvaluations.length;
    const successfulEvaluations = skillEvaluations.filter(item => item.result === 'success').length;
    const successRate = totalEvaluations > 0 ? (successfulEvaluations / totalEvaluations) * 100 : 0;

    // 6. Extract key achievements and challenge areas
    const keyAchievements = skillEvaluations
      .filter(item => item.result === 'success')
      .map(item => item.rationale)
      .slice(0, 3);

    const challengeAreas = skillEvaluations
      .filter(item => item.result === 'failure')
      .map(item => item.rationale)
      .slice(0, 3);

    // 7. Generate score (based on success rate)
    const score = (successRate / 100) * 5; // Scale to 0-5

    // 8. Generate overall feedback
    const feedback = generateFeedback(skillEvaluations, successRate);

    // 9. Build assessment object
    const assessment: ScenarioAssessment = {
      score,
      feedback,
      practice_metrics: {
        success_rate: successRate,
        key_achievements: keyAchievements,
        challenge_areas: challengeAreas
      }
    };

    // 10. Update the user_scenarios table
    await updateUserScenario(supabase, userScenario.user_scenario_id, assessment);

    return assessment;
  } catch (error) {
    console.error('Error processing completed scenario:', error);
    return null;
  }
}

async function updateUserScenario(
  supabase: SupabaseClient,
  userScenarioId: number,
  assessment: ScenarioAssessment
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_scenarios')
      .update({
        status: 'Completed',
        end_time: new Date().toISOString(),
        score: assessment.score,
        feedback: assessment.feedback,
        practice_metrics: assessment.practice_metrics,
        duration_minutes: calculateDurationMinutes(userScenarioId, supabase)
      })
      .eq('user_scenario_id', userScenarioId);

    if (error) {
      throw new Error(`Failed to update user scenario: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating user scenario:', error);
    throw error;
  }
}

async function calculateDurationMinutes(userScenarioId: number, supabase: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_scenarios')
      .select('start_time')
      .eq('user_scenario_id', userScenarioId)
      .single();

    if (error || !data || !data.start_time) {
      return 0;
    }

    const startTime = new Date(data.start_time).getTime();
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    return Math.round(durationMs / (1000 * 60)); // Convert to minutes
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
}

function generateFeedback(skillEvaluations: SkillEvaluation[], successRate: number): string {
  // Basic template-based feedback generation
  let feedback = '';
  
  if (successRate >= 80) {
    feedback = 'Excellent work! You demonstrated strong communication skills. ';
  } else if (successRate >= 60) {
    feedback = 'Good job! You showed solid communication skills with some areas for improvement. ';
  } else if (successRate >= 40) {
    feedback = 'You\'re making progress! There are several areas where you can continue to develop. ';
  } else {
    feedback = 'This scenario presented challenges for you. Let\'s focus on improving these core skills. ';
  }

  // Add specific feedback for successful areas
  const successfulEvals = skillEvaluations.filter(item => item.result === 'success');
  if (successfulEvals.length > 0) {
    feedback += 'Your strengths include: ';
    feedback += successfulEvals.map(item => item.rationale.split('.')[0]).join('; ') + '. ';
  }

  // Add specific feedback for areas needing improvement
  const improvementEvals = skillEvaluations.filter(item => item.result === 'failure');
  if (improvementEvals.length > 0) {
    feedback += 'Areas to focus on: ';
    feedback += improvementEvals.map(item => item.rationale.split('.')[0]).join('; ') + '.';
  }

  return feedback;
} 
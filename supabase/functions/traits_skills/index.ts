import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

interface TraitData {
    value: string;
    rationale: string;
    json_schema: {
        type: string;
        description: string;
    };
}

interface UserTraits {
    clerk_id: string;
    life_context: TraitData;
    stakes_level: TraitData;
    growth_motivation: TraitData;
    confidence_pattern: TraitData;
    interaction_style: TraitData;
}

interface SkillWeight {
    skill_id: number;
    weight_data: {
        base_weight: number;
        trait_influences: TraitInfluence[];
        final_weight: number;
        development_stage: {
            current: string;
            target: string;
            readiness: number;
        };
        evidence: {
            importance_factors: ImportanceFactor[];
            learning_path: string[];
            practice_areas: string[];
        };
    };
}

interface TraitInfluence {
    trait_type: string;
    pattern_key: string;
    importance: number;
    role: string;
    indicators: string[];
}

interface ImportanceFactor {
    reason: string;
    indicators: string[];
}

interface SkillWeightCalculation {
    skillId: number;
    baseWeight: number;
    influences: TraitInfluence[];
    currentStage: string;
    targetStage: string;
    readinessScore: number;
    importanceEvidence: ImportanceFactor[];
    learningFocus: string[];
    practiceAreas: string[];
    primaryTraitType?: string;
}

interface PrioritizedSkill {
    skill_id: number;
    priority_score: number;
    prerequisites: number[];
    development_stage: {
        current: string;
        target: string;
        readiness: number;
    };
}

interface LearningPathNode {
    skill_id: number;
    required_skills: number[];
    learning_activities: string[];
    estimated_duration: number;
    priority_level: 'critical' | 'high' | 'medium' | 'low';
}

// Placeholder functions that must be defined for full integration:
function findSkillById(skillId: number): PrioritizedSkill {
    // In a real scenario, this would retrieve skill data from a cache or DB
    return {
        skill_id: skillId,
        priority_score: 0.8,
        prerequisites: [],
        development_stage: { current: 'struggling', target: 'developing', readiness: 0.5 }
    }
}

function getPrerequisites(skillId: number): number[] {
    // Placeholder: Return no prerequisites by default
    return [];
}

async function getSkillLearningActivities(skill: PrioritizedSkill): Promise<string[]> {
    const { priority_score } = skill;
    const hierarchy = await getSkillHierarchy(skill.skill_id);
    const category = hierarchy[0];
    
    if (category.includes("Communication")) {
        if (priority_score > 1.0) {
            return [
                `Intensive role-play focusing on ${hierarchy.slice(1).join(" > ")} skill gaps`,
                `Expert coaching on specific communication pitfalls identified`
            ];
        } else if (priority_score > 0.85) {
            return [
                `Scenario-based practice in ${hierarchy.slice(-1)[0]}`,
                `Interactive feedback sessions focusing on clarity and consistency`
            ];
        } else if (priority_score > 0.7) {
            return [
                `Review key communication concepts related to ${hierarchy.slice(-1)[0]}`,
                `Short exercise: practicing one aspect of this communication skill`
            ];
        } else {
            return [
                `Quick refresher on ${hierarchy.slice(-1)[0]}`,
                `Optional reading materials on improving this skill`
            ];
        }
    }

    if (category.includes("Logical and Analytical")) {
        if (priority_score > 1.0) {
            return [
                "Complex problem-solving scenarios",
                "Peer review sessions on argument structure"
            ];
        } else if (priority_score > 0.85) {
            return [
                "Practice logical sequencing in simulated case studies",
                "Targeted exercises on avoiding logical fallacies"
            ];
        } else if (priority_score > 0.7) {
            return [
                "Review fundamentals of structured thinking",
                "Short quizzes on identifying irrelevant details"
            ];
        } else {
            return [
                "Brief refresher on maintaining topic flow",
                "Optional problem-solving puzzle"
            ];
        }
    }

    return [
        `General activity for ${hierarchy.slice(-1)[0]}`,
        `Simple practice exercise related to this skill`
    ];
}

async function calculateEstimatedDuration(skill: PrioritizedSkill): Promise<number> {
    const { priority_score, development_stage } = skill;
    const readiness = development_stage.readiness;
    const hierarchy = await getSkillHierarchy(skill.skill_id);
    const depth = hierarchy.length;
    
    let baseDuration = 60;

    if (priority_score > 1.0 && readiness < 0.9) {
        baseDuration = 90;
    } else if (priority_score > 0.85) {
        baseDuration = 75;
    } else if (priority_score < 0.7 && readiness > 0.85) {
        baseDuration = 30;
    }

    if (depth > 3) {
        baseDuration += 15;
    }

    return baseDuration;
}

function determinePriorityLevel(skill: PrioritizedSkill): 'critical' | 'high' | 'medium' | 'low' {
    const { priority_score, development_stage } = skill;

    if (development_stage.current === 'struggling') {
        if (priority_score > 1.0) return 'critical';
        if (priority_score > 0.85) return 'high';
        if (priority_score > 0.7) return 'medium';
        return 'low';
    } else {
        if (priority_score > 0.9) return 'high';
        if (priority_score > 0.7) return 'medium';
        return 'low';
    }
}

// Add new function for skill hierarchy
async function getSkillHierarchy(skill_id: number): Promise<string[]> {
    // Fetch the skill from the database
    let currentId = skill_id;
    const hierarchy: string[] = [];

    // We'll loop upward until we find a skill with no parent
    while (currentId !== null) {
        const { data, error } = await supabase
            .from('skills')
            .select('skill_id, name, parent_skill_id')
            .eq('skill_id', currentId)
            .single();

        if (error) {
            console.error('Error fetching skill hierarchy:', error);
            break;
        }

        if (!data) {
            console.warn(`Skill with id ${currentId} not found`);
            break;
        }

        // Prepend the current skill's name to the start of the hierarchy array
        hierarchy.unshift(data.name);

        // Move to the parent skill for the next iteration
        currentId = data.parent_skill_id;
    }

    return hierarchy;
}


// Replace existing generateLearningPath and addSkillToPath
async function generateLearningPath(prioritizedSkills: PrioritizedSkill[]): Promise<LearningPathNode[]> {
    const learningPath: LearningPathNode[] = [];
    const processedSkills = new Set<number>();
    const skillsByCategory = new Map<string, PrioritizedSkill[]>();

    // Group skills by category
    await Promise.all(prioritizedSkills.map(async (skill) => {
        const hierarchy = await getSkillHierarchy(skill.skill_id);
        const topCategory = hierarchy[0];
        if (!skillsByCategory.has(topCategory)) {
            skillsByCategory.set(topCategory, []);
        }
        skillsByCategory.get(topCategory)!.push(skill);
    }));

    // Process each category
    for (const [category, skills] of skillsByCategory.entries()) {
        skills.sort((a,b) => b.priority_score - a.priority_score);

        for (const skill of skills) {
            if (!processedSkills.has(skill.skill_id)) {
                await addSkillToPath(skill, learningPath, processedSkills);
            }
        }
    }

    return learningPath;
}

async function addSkillToPath(
    skill: PrioritizedSkill,
    path: LearningPathNode[],
    processed: Set<number>
): Promise<void> {
    // Handle prerequisites
    await Promise.all(skill.prerequisites.map(async (prereq) => {
        if (!processed.has(prereq)) {
            const prerequisiteSkill = findSkillById(prereq);
            await addSkillToPath(prerequisiteSkill, path, processed);
        }
    }));

    path.push({
        skill_id: skill.skill_id,
        required_skills: skill.prerequisites,
        learning_activities: await getSkillLearningActivities(skill),
        estimated_duration: await calculateEstimatedDuration(skill),
        priority_level: determinePriorityLevel(skill)
    });

    processed.add(skill.skill_id);
}

function calculateSkillPriorities(weights: SkillWeight[]): PrioritizedSkill[] {
    return weights
        .map(weight => ({
            skill_id: weight.skill_id,
            priority_score: calculatePriorityScore(weight),
            prerequisites: getPrerequisites(weight.skill_id),
            development_stage: weight.weight_data.development_stage
        }))
        .sort((a, b) => b.priority_score - a.priority_score);
}

function calculatePriorityScore(weight: SkillWeight): number {
    const urgencyMultiplier = weight.weight_data.development_stage.current === 'struggling' ? 1.5 : 1;
    const readinessBonus = weight.weight_data.development_stage.readiness;
    const importanceScore = weight.weight_data.final_weight;
    return (importanceScore * urgencyMultiplier * readinessBonus);
}

// Functions that handle requests
serve(async (req) => {
    try {
        const { clerk_id, action_type } = await req.json()

        if (!clerk_id) {
            throw new Error('Clerk ID is required')
        }

        const [traitMappings, userTraits] = await Promise.all([
            loadTraitMappings(),
            loadUserTraits(clerk_id)
        ]);

        switch (action_type) {
            case 'initial_calculation':
                return await handleInitialCalculation(clerk_id, userTraits, traitMappings)
            case 'practice_update':
                return await handlePracticeUpdate(clerk_id, userTraits, traitMappings)
            default:
                throw new Error('Invalid action type')
        }
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }
})

async function loadTraitMappings() {
    const { data, error } = await supabase
        .from('trait_patterns')
        .select(`
            *,
            trait_skill_mappings (
                skill_id,
                importance,
                role,
                development_order,
                indicators,
                practice_areas,
                constraints
            ),
            trait_development_stages (
                skill_id,
                stage_from,
                stage_to,
                readiness_score,
                prerequisites,
                learning_focus
            )
        `)

    if (error) throw error
    return data
}

async function loadUserTraits(clerkId: string, elevenlabsConversationId?: string) {
    console.log('Loading traits for clerk_id:', clerkId, 'elevenlabs_conversation_id:', elevenlabsConversationId);
    
    // First try to get user traits
    const { data: traitsData, error: traitsError } = await supabase
        .from('user_traits')
        .select('*')
        .eq('clerk_id', clerkId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (traitsError) {
        console.error('Error fetching user_traits:', traitsError);
        throw traitsError;
    }
    
    console.log('Traits data:', traitsData);
    
    // If we found traits data, return the first record
    if (traitsData && traitsData.length > 0) {
        return traitsData[0];
    }

    // If no traits found and we have elevenlabs_conversation_id, try that specific conversation
    if (elevenlabsConversationId) {
        console.log('Fetching specific conversation:', elevenlabsConversationId);
        
        // First check if the conversation exists
        const { data: convCheck, error: checkError } = await supabase
            .from('user_conversations')
            .select('id')
            .eq('clerk_id', clerkId)
            .eq('elevenlabs_conversation_id', elevenlabsConversationId);
            
        if (checkError) {
            console.error('Error checking conversation:', checkError);
            throw checkError;
        }
        
        console.log('Conversation check result:', convCheck);
        
        if (!convCheck || convCheck.length === 0) {
            throw new Error(`No conversation found with ID ${elevenlabsConversationId}`);
        }

        const { data: convData, error: convError } = await supabase
            .from('user_conversations')
            .select('data_collection_results')
            .eq('clerk_id', clerkId)
            .eq('elevenlabs_conversation_id', elevenlabsConversationId)
            .maybeSingle();

        if (convError) {
            console.error('Error fetching specific conversation:', convError);
            throw convError;
        }

        console.log('Conversation data:', convData);

        if (!convData || !convData.data_collection_results) {
            throw new Error('No trait data found in the specified conversation');
        }

        return convData.data_collection_results;
    }
}

// Update handleInitialCalculation to handle async learning path generation
async function handleInitialCalculation(
    clerkId: string,
    userTraits: UserTraits,
    traitMappings: any[]
): Promise<Response> {
    const weights = calculateSkillWeights(userTraits, traitMappings);

    const { error: updateError } = await supabase
        .from('user_skill_weights')
        .upsert(weights.map(weight => ({
            clerk_id: clerkId,
            skill_id: weight.skill_id,
            weight_data: weight.weight_data,
            updated_at: new Date().toISOString()
        })));

    if (updateError) throw updateError;

    const prioritizedSkills = calculateSkillPriorities(weights);
    const learningPath = await generateLearningPath(prioritizedSkills);

    await storeLearningPathAndPrioritizedSkills(clerkId, learningPath, prioritizedSkills);

    return new Response(
        JSON.stringify({ success: true, weights, prioritizedSkills, learningPath }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}

// Storing learning path & prioritized skills
async function storeLearningPathAndPrioritizedSkills(
    clerkId: string, 
    learningPath: LearningPathNode[], 
    prioritizedSkills: PrioritizedSkill[]
) {
    const { error } = await supabase
        .from('user_learning_paths')
        .insert([{
            clerk_id: clerkId,
            learning_path: learningPath,
            prioritized_skills: prioritizedSkills,
            created_at: new Date().toISOString()
        }])

    if (error) throw error
}

function calculateSkillWeights(
    traits: UserTraits,
    traitMappings: any[]
): SkillWeight[] {
    const skillWeights = new Map<number, SkillWeightCalculation>()

    for (const mapping of traitMappings) {
        if (!mapping.trait_skill_mappings) continue

        for (const skillMapping of mapping.trait_skill_mappings) {
            const currentWeight = skillWeights.get(skillMapping.skill_id) || 
                createInitialWeight(skillMapping.skill_id)
            
            updateWeightFromTrait(
                currentWeight,
                mapping,
                skillMapping,
                traits
            )

            skillWeights.set(skillMapping.skill_id, currentWeight)
        }

        if (mapping.trait_development_stages) {
            for (const stage of mapping.trait_development_stages) {
                const weight = skillWeights.get(stage.skill_id)
                if (weight) {
                    updateDevelopmentStage(weight, stage, traits)
                }
            }
        }
    }

    return Array.from(skillWeights.values()).map(formatSkillWeight)
}

function createInitialWeight(skillId: number): SkillWeightCalculation {
    return {
        skillId,
        baseWeight: 0,
        influences: [],
        currentStage: 'developing',
        targetStage: 'managing',
        readinessScore: 0.5,
        importanceEvidence: [],
        learningFocus: [],
        practiceAreas: []
    }
}

function updateWeightFromTrait(
    weight: SkillWeightCalculation,
    traitPattern: any,
    skillMapping: any,
    traits: UserTraits
) {
    // Ensure these fields exist in traitPattern (placeholder assumption)
    const traitType = traitPattern.trait_type || 'unknown_trait'
    const patternKey = traitPattern.pattern_key || 'unknown_pattern'

    if (skillMapping.importance > weight.baseWeight) {
        weight.baseWeight = skillMapping.importance
        weight.primaryTraitType = traitType
    }

    weight.influences.push({
        trait_type: traitType,
        pattern_key: patternKey,
        importance: skillMapping.importance,
        role: skillMapping.role,
        indicators: skillMapping.indicators || []
    })

    if (skillMapping.practice_areas) {
        weight.practiceAreas.push(...skillMapping.practice_areas)
    }

    weight.importanceEvidence.push({
        reason: `${skillMapping.importance} importance from ${traitType}:${patternKey}`,
        indicators: skillMapping.indicators || []
    })
}

function updateDevelopmentStage(
    weight: SkillWeightCalculation,
    stage: any,
    traits: UserTraits
) {
    const confidencePattern = traits.confidence_pattern.value || '';
    const patternMatch = confidencePattern.match(/PATTERN:\s*([^|]+)/);
    if (!patternMatch) {
        weight.currentStage = 'developing';
        weight.targetStage = 'managing';
    } else {
        const [current, target] = patternMatch[1].trim().split('>').map(s => s.trim());
        weight.currentStage = current || 'developing';
        weight.targetStage = target || 'managing';
    }

    weight.readinessScore = stage.readiness_score || weight.readinessScore;

    if (stage.learning_focus) {
        weight.learningFocus.push(...stage.learning_focus);
    }
}

function formatSkillWeight(weight: SkillWeightCalculation): SkillWeight {
    const uniqueLearningPath = Array.from(new Set(weight.learningFocus));
    const uniquePracticeAreas = Array.from(new Set(weight.practiceAreas));

    const uniqueImportanceFactors = weight.importanceEvidence.reduce((acc, factor) => {
        const key = `${factor.reason}-${factor.indicators.join(',')}`;
        if (!acc.has(key)) {
            acc.set(key, factor);
        }
        return acc;
    }, new Map<string, ImportanceFactor>());

    return {
        skill_id: weight.skillId,
        weight_data: {
            base_weight: weight.baseWeight,
            trait_influences: weight.influences,
            final_weight: calculateFinalWeight(weight),
            development_stage: {
                current: weight.currentStage,
                target: weight.targetStage,
                readiness: weight.readinessScore
            },
            evidence: {
                importance_factors: Array.from(uniqueImportanceFactors.values()),
                learning_path: uniqueLearningPath,
                practice_areas: uniquePracticeAreas
            }
        }
    };
}

function calculateFinalWeight(weight: SkillWeightCalculation): number {
    const influenceMultiplier = weight.influences.length > 0 
        ? weight.influences.reduce((sum, influence) => sum + influence.importance, 0) / weight.influences.length
        : 1;
    return weight.baseWeight * influenceMultiplier * weight.readinessScore;
}

async function handlePracticeUpdate(
    clerkId: string,
    userTraits: UserTraits,
    traitMappings: any[]
): Promise<Response> {
    const currentWeights = await supabase
        .from('user_skill_weights')
        .select('*')
        .eq('clerk_id', clerkId);

    const practiceResults = await supabase
        .from('user_scenario_evaluations')
        .select('*')
        .eq('clerk_id', clerkId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (currentWeights.error) throw currentWeights.error
    if (practiceResults.error) throw practiceResults.error

    const updatedWeights = updateWeightsFromPractice(
        currentWeights.data,
        practiceResults.data,
        userTraits
    )

    const { error: updateError } = await supabase
        .from('user_skill_weights')
        .upsert(
            updatedWeights.map(weight => ({
                clerk_id: clerkId,
                skill_id: weight.skill_id,
                weight_data: weight.weight_data,
                updated_at: new Date().toISOString()
            }))
        )

    if (updateError) throw updateError

    return new Response(
        JSON.stringify({ success: true, weights: updatedWeights }),
        { headers: { 'Content-Type': 'application/json' } }
    )
}

function updateWeightsFromPractice(
    currentWeights: SkillWeight[],
    practiceResults: any[],
    userTraits: UserTraits
): SkillWeight[] {
    return currentWeights.map(weight => {
        const relevantResults = practiceResults.filter(
            result => result.skill_id === weight.skill_id
        )

        if (relevantResults.length === 0) return weight

        const successRate = calculateSuccessRate(relevantResults)
        const progressIndicators = analyzeProgress(relevantResults)

        const updatedWeight = {
            ...weight,
            weight_data: {
                ...weight.weight_data,
                development_stage: updateDevelopmentStageFromPractice(
                    weight.weight_data.development_stage,
                    successRate,
                    progressIndicators
                )
            }
        }

        return updatedWeight
    })
}

function calculateSuccessRate(results: any[]): number {
    const successes = results.filter(r => r.score >= 0.7).length
    return successes / results.length
}

function analyzeProgress(results: any[]): any {
    const scores = results.map(r => r.score);
    const improvement = scores[0] < scores[scores.length - 1];
    const consistency = calculateConsistency(scores);
    return { improvement, consistency };
}

function calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 1;
    const variations = scores.slice(1).map((score, i) => Math.abs(score - scores[i]));
    const average = variations.reduce((sum, v) => sum + v, 0) / variations.length;
    return 1 - (average || 0);
}

function updateDevelopmentStageFromPractice(
    currentStage: any,
    successRate: number,
    progressIndicators: any
): any {
    // Simple logic: Increase readiness if successRate high or improvement observed
    let newReadiness = currentStage.readiness;
    if (successRate > 0.8) newReadiness += 0.1;
    if (progressIndicators.improvement) newReadiness += 0.05;
    newReadiness = Math.min(1, newReadiness);
    return {
        ...currentStage,
        readiness: newReadiness
    }
}

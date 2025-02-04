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
        // Get the notification payload from the request
        const payload = await req.json()
        console.log('Received payload:', payload)

        const { clerk_id, analysis, scenario_info } = payload

        if (!clerk_id) {
            throw new Error('Clerk ID is required')
        }

        // Get conversation data with analysis
        const [traitMappings, userTraits] = await Promise.all([
            loadTraitMappings(),
            loadUserTraits(clerk_id)
        ]);

        // If we have scenario_info with skill_ids, process those skills
        if (scenario_info?.skill_ids?.length > 0) {
            const weights = calculateSkillWeights(userTraits, traitMappings);
            
            // Filter weights to only include skills from this scenario
            const scenarioWeights = weights.filter(w => 
                scenario_info.skill_ids.includes(w.skill_id)
            );

            const { error: updateError } = await supabase
                .from('user_skill_weights')
                .upsert(scenarioWeights.map(weight => ({
                    clerk_id: clerk_id,
                    skill_id: weight.skill_id,
                    weight_data: weight.weight_data,
                    updated_at: new Date().toISOString()
                })));

            if (updateError) throw updateError;

            const prioritizedSkills = calculateSkillPriorities(scenarioWeights);
            const learningPath = await generateLearningPath(prioritizedSkills);

            await storeLearningPathAndPrioritizedSkills(clerk_id, learningPath, prioritizedSkills);
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        )
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

    // If no traits found and we have elevenlabs_conversation_id, get data from conversation
    if (elevenlabsConversationId) {
        console.log('Fetching specific conversation:', elevenlabsConversationId);
        
        const { data: convData, error: convError } = await supabase
            .from('user_conversations')
            .select('analysis')
            .eq('clerk_id', clerkId)
            .eq('elevenlabs_conversation_id', elevenlabsConversationId)
            .single();

        if (convError) {
            console.error('Error fetching conversation:', convError);
            throw convError;
        }

        if (!convData || !convData.analysis) {
            throw new Error('No analysis found in the specified conversation');
        }

        // Process evaluation results into traits
        const evaluationResults = convData.analysis.evaluation_criteria_results;
        return {
            clerk_id: clerkId,
            confidence_pattern: processConfidencePattern(evaluationResults),
            interaction_style: processInteractionStyle(evaluationResults),
            stakes_level: processStakesLevel(evaluationResults)
        };
    }

    throw new Error('No traits or conversation data found');
}

function processConfidencePattern(evaluationResults: any) {
    const confidenceResult = evaluationResults.criterion_1?.result;
    return {
        value: confidenceResult === 'success' 
            ? 'PATTERN: confident > mastering'
            : 'PATTERN: struggling > developing'
    };
}

function processInteractionStyle(evaluationResults: any) {
    const emotionalControl = evaluationResults.criterion_2?.result;
    const engagement = evaluationResults.criterion_4?.result;
    
    let style = 'developing';
    if (emotionalControl === 'success' && engagement === 'success') {
        style = 'balanced_and_engaging';
    } else if (emotionalControl === 'failure' && engagement === 'failure') {
        style = 'needs_improvement';
    }
    
    return { value: style };
}

function processStakesLevel(evaluationResults: any) {
    const failureCount = Object.values(evaluationResults)
        .filter((result: any) => result.result === 'failure')
        .length;
    
    let level = 'low_stakes';
    if (failureCount >= 3) {
        level = 'high_stakes';
    } else if (failureCount >= 1) {
        level = 'medium_stakes';
    }
    
    return { value: level };
}

// Add missing function declarations
function processTraitsData(data: any): UserTraits {
    const defaultJsonSchema = {
        type: 'string',
        description: 'Default trait schema'
    };

    return {
        clerk_id: data.clerk_id,
        stakes_level: { 
            value: data.stakes_level || 'medium_stakes', 
            rationale: '',
            json_schema: defaultJsonSchema
        },
        interaction_style: { 
            value: data.interaction_style || 'balanced', 
            rationale: '',
            json_schema: defaultJsonSchema
        },
        confidence_pattern: { 
            value: data.confidence_pattern || 'developing', 
            rationale: '',
            json_schema: defaultJsonSchema
        },
        life_context: { 
            value: data.life_context || 'general', 
            rationale: '',
            json_schema: defaultJsonSchema
        },
        growth_motivation: { 
            value: data.growth_motivation || 'moderate', 
            rationale: '',
            json_schema: defaultJsonSchema
        }
    };
}

function calculateInitialWeights(traits: UserTraits): SkillWeight[] {
    // Basic implementation - this should be expanded based on your business logic
    return [];
}

function calculateSkillWeights(traits: UserTraits, mappings: any[]): SkillWeight[] {
    // Implementation based on your business logic
    return [];
}

async function storeLearningPathAndPrioritizedSkills(
    clerkId: string, 
    learningPath: LearningPathNode[], 
    prioritizedSkills: PrioritizedSkill[]
): Promise<void> {
    const { error } = await supabase
        .from('user_learning_paths')
        .upsert({
            clerk_id: clerkId,
            learning_path: learningPath,
            prioritized_skills: prioritizedSkills,
            updated_at: new Date().toISOString()
        });
    
    if (error) throw error;
}

// Update the handleInitialCalculation function to fix type issues
async function handleInitialCalculation(data: {
    clerk_id: string,
    data_collection_results?: any,
    userTraits?: UserTraits,
    traitMappings?: any[]
}): Promise<Response> {
    try {
        let traits: UserTraits;
        
        if (data.data_collection_results) {
            traits = processTraitsData(data.data_collection_results);
            
            await supabase.from('user_traits').insert({
                clerk_id: data.clerk_id,
                stakes_level: traits.stakes_level,
                interaction_style: traits.interaction_style,
                confidence_pattern: traits.confidence_pattern
            });
        } else if (data.userTraits && data.traitMappings) {
            traits = data.userTraits;
        } else {
            throw new Error('Either data_collection_results or userTraits+traitMappings must be provided');
        }

        const weights = data.traitMappings 
            ? calculateSkillWeights(traits, data.traitMappings)
            : calculateInitialWeights(traits);

        const { error: updateError } = await supabase
            .from('user_skill_weights')
            .upsert(weights.map((weight: SkillWeight) => ({
                clerk_id: data.clerk_id,
                skill_id: weight.skill_id,
                weight_data: weight.weight_data,
                updated_at: new Date().toISOString()
            })));

        if (updateError) throw updateError;

        if (data.traitMappings) {
            const prioritizedSkills = calculateSkillPriorities(weights);
            const learningPath = await generateLearningPath(prioritizedSkills);
            await storeLearningPathAndPrioritizedSkills(data.clerk_id, learningPath, prioritizedSkills);

            return new Response(
                JSON.stringify({ 
                    success: true, 
                    weights, 
                    prioritizedSkills, 
                    learningPath 
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                weights 
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in handleInitialCalculation:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

async function handlePracticeUpdate(
    clerkId: string,
    userTraits: UserTraits,
    traitMappings: any[]
): Promise<Response> {
    try {
        const { data: currentWeights } = await supabase
            .from('user_skill_weights')
            .select('*')
            .eq('clerk_id', clerkId);

        if (!currentWeights) {
            throw new Error('No weights found for user');
        }

        const weights = calculateSkillWeights(userTraits, traitMappings);

        const { error: updateError } = await supabase
            .from('user_skill_weights')
            .upsert(weights.map((weight: SkillWeight) => ({
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
            JSON.stringify({ 
                success: true, 
                weights, 
                prioritizedSkills, 
                learningPath 
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in handlePracticeUpdate:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Update the handler to use the new combined function with correct arguments
const handler = async (req: any) => {
    const { clerk_id, action_type, elevenlabs_conversation_id } = req.body;

    try {
        // Get conversation data
        const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', elevenlabs_conversation_id)
            .single();

        if (action_type === 'initial_calculation') {
            // Get trait mappings for initial calculation
            const { data: traitMappings } = await supabase
                .from('trait_patterns')
                .select('*');

            return await handleInitialCalculation({
                clerk_id,
                data_collection_results: conversation.data_collection_results,
                traitMappings
            });
        } else {
            return await handlePracticeUpdate(
                clerk_id,
                {} as UserTraits, // This needs to be loaded from the database
                [] // This needs to be loaded from the database
            );
        }
    } catch (error) {
        console.error('Error processing traits/skills:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
};

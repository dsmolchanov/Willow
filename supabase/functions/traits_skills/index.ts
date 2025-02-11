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

interface TraitPattern {
    id: number;
    name: string;
    pattern_key: string;
    trait_skill_mappings: TraitSkillMapping[];
    trait_development_stages: TraitDevelopmentStage[];
}

interface TraitSkillMapping {
    skill_id: number;
    importance: number;
    role: string;
    development_order: number;
    indicators: string[];
    practice_areas: string[];
    constraints: any;
    skills?: {
        skill_id: number;
        is_active: boolean;
    };
    learning_path?: string[];
}

interface TraitDevelopmentStage {
    skill_id: number;
    stage_from: string;
    stage_to: string;
    readiness_score: number;
    prerequisites: number[];
    learning_focus: string[];
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

    // Process each skill
    for (const skill of prioritizedSkills) {
            if (!processedSkills.has(skill.skill_id)) {
                await addSkillToPath(skill, learningPath, processedSkills);
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
        .sort((a: PrioritizedSkill, b: PrioritizedSkill) => b.priority_score - a.priority_score);
}

function calculatePriorityScore(weight: SkillWeight): number {
    const urgencyMultiplier = weight.weight_data.development_stage.current === 'struggling' ? 1.5 : 1;
    const readinessBonus = weight.weight_data.development_stage.readiness;
    const importanceScore = weight.weight_data.final_weight;
    return (importanceScore * urgencyMultiplier * readinessBonus);
}

// Functions that handle requests
serve(async (req: Request) => {
    try {
        const payload = await req.json()
        console.log('Received payload:', payload)

        const { clerk_id, elevenlabs_conversation_id } = payload
        console.log('Processing for clerk_id:', clerk_id, 'conversation_id:', elevenlabs_conversation_id)

        if (!clerk_id) {
            throw new Error('Clerk ID is required')
        }

        if (!elevenlabs_conversation_id) {
            throw new Error('Conversation ID is required')
        }

        // Get conversation data with scenario_info
        const { data: conversation, error: convError } = await supabase
            .from('user_conversations')
            .select('*')
            .eq('elevenlabs_conversation_id', elevenlabs_conversation_id)
            .single();
            
        if (convError) {
            console.error('Error fetching conversation:', convError);
            throw convError;
        }

        const action_type = conversation.scenario_info.type === 'onboarding' ? 'initial_calculation' : 'practice_update'
        console.log('Determined action_type:', action_type)

        if (action_type === 'initial_calculation') {
            console.log('Performing initial calculation');
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
            console.log('Loaded trait mappings count:', traitMappings?.length);

            // Filter out any remaining inactive skills (just in case)
            const filteredMappings = traitMappings?.map((mapping: TraitPattern) => ({
                ...mapping,
                trait_skill_mappings: mapping.trait_skill_mappings.filter(
                    (skillMapping: TraitSkillMapping) => skillMapping.skills?.is_active
                )
            }));

            console.log('Active skills count:', filteredMappings?.reduce(
                (sum: number, mapping: TraitPattern) => sum + (mapping.trait_skill_mappings?.length || 0), 
                0
            ));

            if (!conversation?.analysis) {
                console.error('No analysis found in conversation');
                throw new Error('No analysis found in conversation data');
            }

            const result = await handleInitialCalculation({
                clerk_id,
                data_collection_results: conversation.analysis,
                traitMappings: filteredMappings
            });

            console.log('Initial calculation completed');
            return result;
        } else if (action_type === 'practice_update') {
            console.log('Performing practice update');
            const userTraits = await loadUserTraits(clerk_id, elevenlabs_conversation_id);
            console.log('Loaded user traits:', !!userTraits);
            
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
                console.error('Error fetching trait mappings for practice update:', mappingsError);
                throw mappingsError;
            }

            // Filter out any remaining inactive skills (just in case)
            const filteredMappings = traitMappings?.map((mapping: TraitPattern) => ({
                ...mapping,
                trait_skill_mappings: mapping.trait_skill_mappings.filter(
                    (skillMapping: TraitSkillMapping) => skillMapping.skills?.is_active
                )
            }));

            return await handlePracticeUpdate(clerk_id, userTraits, filteredMappings || []);
        } else {
            throw new Error(`Unsupported action_type: ${action_type}`);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Error stack:', error.stack);
        } else {
            console.error('Non-Error object thrown:', error);
        }
        return new Response(
            JSON.stringify({ 
                error: errorMessage,
                details: error instanceof Error ? error.stack : String(error)
            }),
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

function calculateSkillWeights(traits: UserTraits, mappings: TraitPattern[]): SkillWeight[] {
    console.log('Calculating skill weights with traits:', {
        stakes: traits.stakes_level?.value,
        interaction: traits.interaction_style?.value,
        confidence: traits.confidence_pattern?.value
    });

    const weights: SkillWeight[] = [];

    // Process each trait pattern mapping
    for (const mapping of mappings) {
        // Get skill mappings for this trait pattern
        const skillMappings = mapping.trait_skill_mappings || [];
        const developmentStages = mapping.trait_development_stages || [];

        console.log('Processing trait pattern with:', {
            skillMappingsCount: skillMappings.length,
            developmentStagesCount: developmentStages.length,
            pattern: mapping.pattern_key || mapping.id || 'unknown'
        });

        for (const skillMapping of skillMappings) {
            const baseWeight = calculateBaseWeight(traits, mapping, skillMapping);
            const traitInfluences = determineTraitInfluences(traits, mapping, skillMapping);
            const developmentStage = determineDevelopmentStage(traits, developmentStages, skillMapping);

            weights.push({
                skill_id: skillMapping.skill_id,
                weight_data: {
                    base_weight: baseWeight,
                    trait_influences: traitInfluences,
                    final_weight: calculateFinalWeight(baseWeight, traitInfluences),
                    development_stage: developmentStage,
                    evidence: {
                        importance_factors: generateImportanceFactors(traits, mapping, skillMapping),
                        learning_path: skillMapping.learning_path || [],
                        practice_areas: skillMapping.practice_areas || []
                    }
                }
            });
        }
    }

    const summary = {
        totalWeights: weights.length,
        weightsByFinalWeight: weights.reduce((acc: Record<number, number>, weight: SkillWeight) => {
            const range = Math.floor(weight.weight_data.final_weight * 10) / 10;
            acc[range] = (acc[range] || 0) + 1;
            return acc;
        }, {} as Record<number, number>),
        averageFinalWeight: weights.reduce((sum: number, weight: SkillWeight) => 
            sum + weight.weight_data.final_weight, 0
        ) / weights.length
    };

    console.log('Generated weights summary:', summary);
    return weights;
}

function calculateBaseWeight(traits: UserTraits, mapping: TraitPattern, skillMapping: TraitSkillMapping): number {
    // Base weight calculation based on importance and trait values
    let weight = skillMapping.importance || 0.5;

    // Adjust weight based on stakes level
    if (traits.stakes_level?.value === 'high_stakes') {
        weight *= 1.2;
    } else if (traits.stakes_level?.value === 'low_stakes') {
        weight *= 0.8;
    }

    // Adjust weight based on confidence pattern
    if (traits.confidence_pattern?.value?.includes('struggling')) {
        weight *= 1.3;
    }

    return Math.min(Math.max(weight, 0), 1); // Ensure weight is between 0 and 1
}

function determineTraitInfluences(traits: UserTraits, mapping: TraitPattern, skillMapping: TraitSkillMapping): TraitInfluence[] {
    const influences: TraitInfluence[] = [];

    // Add stakes level influence
    if (traits.stakes_level?.value) {
        influences.push({
            trait_type: 'stakes_level',
            pattern_key: traits.stakes_level.value,
            importance: 0.8,
            role: 'modifier',
            indicators: ['Affects urgency and priority']
        });
    }

    // Add confidence pattern influence
    if (traits.confidence_pattern?.value) {
        influences.push({
            trait_type: 'confidence_pattern',
            pattern_key: traits.confidence_pattern.value,
            importance: 0.9,
            role: 'primary',
            indicators: ['Determines learning approach']
        });
    }

    // Add interaction style influence
    if (traits.interaction_style?.value) {
        influences.push({
            trait_type: 'interaction_style',
            pattern_key: traits.interaction_style.value,
            importance: 0.7,
            role: 'context',
            indicators: ['Shapes practice methodology']
        });
    }

    return influences;
}

function calculateFinalWeight(baseWeight: number, influences: TraitInfluence[]): number {
    let finalWeight = baseWeight;

    // Apply each influence's effect
    for (const influence of influences) {
        finalWeight *= (1 + (influence.importance - 0.5) * 0.4);
    }

    return Math.min(Math.max(finalWeight, 0), 1); // Ensure weight is between 0 and 1
}

function determineDevelopmentStage(traits: UserTraits, stages: TraitDevelopmentStage[], skillMapping: TraitSkillMapping): {
    current: string;
    target: string;
    readiness: number;
} {
    // Default stage if no matching stages found
    const defaultStage = {
        current: 'developing',
        target: 'mastering',
        readiness: 0.5
    };

    // Find matching stage based on traits
    const matchingStage = stages.find(stage => 
        stage.skill_id === skillMapping.skill_id &&
        traits.confidence_pattern?.value?.includes(stage.stage_from)
    );

    if (!matchingStage) {
        return defaultStage;
    }

    return {
        current: matchingStage.stage_from,
        target: matchingStage.stage_to,
        readiness: matchingStage.readiness_score
    };
}

function generateImportanceFactors(traits: UserTraits, mapping: TraitPattern, skillMapping: TraitSkillMapping): ImportanceFactor[] {
    const factors: ImportanceFactor[] = [];

    // Add stakes-based factor
    if (traits.stakes_level?.value === 'high_stakes') {
        factors.push({
            reason: 'Critical for high-stakes situations',
            indicators: ['High impact on outcomes', 'Immediate relevance']
        });
    }

    // Add confidence-based factor
    if (traits.confidence_pattern?.value?.includes('struggling')) {
        factors.push({
            reason: 'Identified as growth area',
            indicators: ['Current performance gap', 'Development opportunity']
        });
    }

    // Add interaction style factor
    if (traits.interaction_style?.value) {
        factors.push({
            reason: 'Aligns with interaction preferences',
            indicators: ['Matches learning style', 'Supports natural tendencies']
        });
    }

    return factors;
}

async function storeLearningPathAndPrioritizedSkills(
    clerkId: string, 
    learningPath: LearningPathNode[], 
    prioritizedSkills: PrioritizedSkill[]
): Promise<void> {
    // First try to find existing record
    const { data: existingPath, error: selectError } = await supabase
        .from('user_learning_paths')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing learning path:', selectError);
        throw selectError;
    }

    const record = {
            clerk_id: clerkId,
            learning_path: learningPath,
            prioritized_skills: prioritizedSkills,
        created_at: new Date().toISOString()
    };

    if (existingPath?.id) {
        // Update existing record
        const { error: updateError } = await supabase
            .from('user_learning_paths')
            .update(record)
            .eq('id', existingPath.id);

        if (updateError) {
            console.error('Error updating learning path:', updateError);
            throw updateError;
        }
    } else {
        // Insert new record
        const { error: insertError } = await supabase
            .from('user_learning_paths')
            .insert(record);

        if (insertError) {
            console.error('Error inserting learning path:', insertError);
            throw insertError;
        }
    }
}

// Update the handleInitialCalculation function to fix type issues
async function handleInitialCalculation(data: {
    clerk_id: string,
    data_collection_results: any,
    traitMappings: TraitPattern[]
}): Promise<Response> {
    try {
        console.log('Starting handleInitialCalculation with:', {
            hasClerkId: !!data.clerk_id,
            hasResults: !!data.data_collection_results,
            mappingsCount: data.traitMappings?.length
        });

        if (!data.data_collection_results) {
            throw new Error('data_collection_results is required for initial calculation');
        }

        if (!data.traitMappings?.length) {
            throw new Error('trait mappings are required for initial calculation');
        }

        let traits: UserTraits;
        try {
            traits = processTraitsData(data.data_collection_results);
            console.log('Processed traits data:', {
                hasLifeContext: !!traits.life_context,
                hasStakesLevel: !!traits.stakes_level,
                hasGrowthMotivation: !!traits.growth_motivation,
                hasConfidencePattern: !!traits.confidence_pattern,
                hasInteractionStyle: !!traits.interaction_style
            });
            
            // Store the processed traits
            const { error: traitsError } = await supabase.from('user_traits').insert({
                clerk_id: data.clerk_id,
                stakes_level: traits.stakes_level,
                interaction_style: traits.interaction_style,
                confidence_pattern: traits.confidence_pattern,
                created_at: new Date().toISOString()
            });

            if (traitsError) {
                console.error('Error storing user traits:', traitsError);
                throw traitsError;
            }
        } catch (error) {
            console.error('Error processing traits data:', error);
            throw new Error(`Failed to process traits data: ${error instanceof Error ? error.message : String(error)}`);
        }

        let weights;
        try {
            weights = calculateSkillWeights(traits, data.traitMappings);
            console.log(`Calculated ${weights?.length || 0} skill weights`);

            if (!weights?.length) {
                throw new Error('No skill weights were calculated');
            }
        } catch (error) {
            console.error('Error calculating skill weights:', error);
            throw new Error(`Failed to calculate skill weights: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
        const { error: updateError } = await supabase
            .from('user_skill_weights')
                .upsert(weights.map(weight => ({
                clerk_id: data.clerk_id,
                skill_id: weight.skill_id,
                weight_data: weight.weight_data,
                updated_at: new Date().toISOString()
            })));

            if (updateError) {
                console.error('Error updating skill weights:', updateError);
                throw updateError;
            }
        } catch (error) {
            console.error('Error storing skill weights:', error);
            throw new Error(`Failed to store skill weights: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            const prioritizedSkills = calculateSkillPriorities(weights);
            console.log(`Prioritized ${prioritizedSkills.length} skills`);
            
            const learningPath = await generateLearningPath(prioritizedSkills);
            console.log(`Generated learning path with ${learningPath.length} nodes`);

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
        } catch (error) {
            console.error('Error generating learning path:', error);
            throw new Error(`Failed to generate learning path: ${error instanceof Error ? error.message : String(error)}`);
        }

    } catch (error) {
        console.error('Error in handleInitialCalculation:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error),
                details: error instanceof Error ? error.stack : String(error)
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
    traitMappings: TraitPattern[]
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Types
interface UserTraits {
    clerk_id: string;
    life_context: string;
    stakes_level: string;
    growth_motivation: string;
    confidence_pattern: string;
    interaction_style: string;
}

interface SkillWeight {
    skill_id: number;
    base_weight: number;
    context_multiplier: number;
    urgency_factor: number;
    readiness_score: number;
    final_weight: number;
    development_stage: {
        current_level: string;
        target_level: string;
    };
}

interface TraitMap {
    interactionStyles: Record<string, TraitSkillMapping>;
    stakesLevels: Record<string, TraitSkillMapping>;
    developmentStages: Record<string, TraitSkillMapping>;
    lifeContexts: Record<string, TraitSkillMapping>;
}

interface TraitSkillMapping {
    skills: Record<string, SkillImportance>;
    developmentStages?: any[];  // TODO: Define specific type
}

interface SkillImportance {
    importance: number;
    role: string;
    developmentOrder: number;
    indicators: string[];
    practiceAreas: string[];
    constraints: any;  // TODO: Define constraints structure
}

// Main handler
serve(async (req) => {
    try {
        const { clerk_id, action_type } = await req.json()

        if (!clerk_id) {
            throw new Error('Clerk ID is required')
        }

        // Load trait maps from database
        const traitMaps = await loadTraitMaps()

        switch (action_type) {
            case 'initial_calculation':
                return await handleInitialCalculation(clerk_id, traitMaps)
            case 'practice_update':
                return await handlePracticeUpdate(clerk_id, traitMaps)
            default:
                throw new Error('Invalid action type')
        }
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            }
        )
    }
})

async function loadTraitMaps(): Promise<TraitMap> {
    const { data, error } = await supabase
        .from('trait_patterns')
        .select(`
            *,
            skill_mappings:trait_skill_mappings(
                skill_id,
                importance,
                role,
                development_order,
                indicators,
                practice_areas,
                constraints
            ),
            development_stages:trait_development_stages(*)
        `)

    if (error) throw error

    return organizeTraitMaps(data)
}

function organizeTraitMaps(rawMaps: any[]): TraitMap {
    // TODO: Implement proper typing for rawMaps
    const organized: TraitMap = {
        interactionStyles: {},
        stakesLevels: {},
        developmentStages: {},
        lifeContexts: {}
    }

    for (const pattern of rawMaps) {
        const mappedSkills = pattern.skill_mappings.reduce((acc, mapping) => {
            acc[mapping.skill_id] = {
                importance: mapping.importance,
                role: mapping.role,
                developmentOrder: mapping.development_order,
                indicators: mapping.indicators,
                practiceAreas: mapping.practice_areas,
                constraints: mapping.constraints
            }
            return acc
        }, {})

        switch (pattern.trait_type) {
            case 'interaction_style':
                organized.interactionStyles[pattern.pattern_key] = {
                    skills: mappedSkills,
                    developmentStages: pattern.development_stages
                }
                break
            case 'stakes_level':
                organized.stakesLevels[pattern.pattern_key] = {
                    skills: mappedSkills
                }
                break
            // Add other trait types as needed
        }
    }

    return organized
}

async function handleInitialCalculation(
    clerkId: string, 
    traitMaps: TraitMap
): Promise<Response> {
    // Get user traits
    const { data: traits, error: traitsError } = await supabase
        .from('user_traits')
        .select('*')
        .eq('clerk_id', clerkId)
        .single()

    if (traitsError) throw traitsError

    // Calculate initial weights
    const weights = calculateInitialWeights(traits, traitMaps)

    // Store weights in database
    const { error: updateError } = await supabase
        .from('skill_weights')
        .upsert(
            weights.map(weight => ({
                clerk_id: clerkId,
                ...weight,
                updated_at: new Date().toISOString()
            }))
        )

    if (updateError) throw updateError

    return new Response(
        JSON.stringify({ success: true, weights }),
        { headers: { 'Content-Type': 'application/json' } }
    )
}

function calculateInitialWeights(
    traits: UserTraits, 
    traitMaps: TraitMap
): SkillWeight[] {
    const weights: SkillWeight[] = []
    const relevantSkills = identifyRelevantSkills(traits, traitMaps)

    for (const skillId of relevantSkills) {
        const baseWeight = calculateBaseWeight(skillId, traits, traitMaps)
        const contextMultiplier = calculateContextMultiplier(skillId, traits, traitMaps)
        const urgencyFactor = calculateUrgencyFactor(skillId, traits, traitMaps)
        const readinessScore = calculateReadinessScore(skillId, traits, traitMaps)
        const developmentStage = determineDevelopmentStage(skillId, traits, traitMaps)

        weights.push({
            skill_id: skillId,
            base_weight: baseWeight,
            context_multiplier: contextMultiplier,
            urgency_factor: urgencyFactor,
            readiness_score: readinessScore,
            final_weight: baseWeight * contextMultiplier * urgencyFactor * readinessScore,
            development_stage: developmentStage
        })
    }

    return weights.sort((a, b) => b.final_weight - a.final_weight)
}

async function handlePracticeUpdate(
    clerkId: string, 
    traitMaps: TraitMap
): Promise<Response> {
    // Get current weights and recent practice results
    const [weights, practiceResults] = await Promise.all([
        supabase
            .from('skill_weights')
            .select('*')
            .eq('clerk_id', clerkId),
        supabase
            .from('user_scenario_evaluations')
            .select('*')
            .eq('clerk_id', clerkId)
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    if (weights.error) throw weights.error
    if (practiceResults.error) throw practiceResults.error

    // Update weights based on practice results
    const updatedWeights = updateWeights(
        weights.data,
        practiceResults.data,
        traitMaps
    )

    // Store updated weights
    const { error: updateError } = await supabase
        .from('skill_weights')
        .upsert(
            updatedWeights.map(weight => ({
                clerk_id: clerkId,
                ...weight,
                updated_at: new Date().toISOString()
            }))
        )

    if (updateError) throw updateError

    return new Response(
        JSON.stringify({ success: true, weights: updatedWeights }),
        { headers: { 'Content-Type': 'application/json' } }
    )
}

// TODO: Implement these helper functions
function identifyRelevantSkills(traits: UserTraits, traitMaps: TraitMap): number[] {
    // Placeholder: Implement skill identification logic
    return []
}

function calculateBaseWeight(
    skillId: number, 
    traits: UserTraits, 
    traitMaps: TraitMap
): number {
    // Placeholder: Implement base weight calculation
    return 0.5
}

function calculateContextMultiplier(
    skillId: number, 
    traits: UserTraits, 
    traitMaps: TraitMap
): number {
    // Placeholder: Implement context multiplier calculation
    return 1.0
}

function calculateUrgencyFactor(
    skillId: number, 
    traits: UserTraits, 
    traitMaps: TraitMap
): number {
    // Placeholder: Implement urgency factor calculation
    return 1.0
}

function calculateReadinessScore(
    skillId: number, 
    traits: UserTraits, 
    traitMaps: TraitMap
): number {
    // Placeholder: Implement readiness score calculation
    return 0.5
}

function determineDevelopmentStage(
    skillId: number, 
    traits: UserTraits, 
    traitMaps: TraitMap
): { current_level: string; target_level: string } {
    // Placeholder: Implement development stage determination
    return {
        current_level: 'developing',
        target_level: 'managing'
    }
}

function updateWeights(
    currentWeights: SkillWeight[], 
    practiceResults: any[],
    traitMaps: TraitMap
): SkillWeight[] {
    // Placeholder: Implement weight update logic
    return currentWeights
}
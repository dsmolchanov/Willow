import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface UserTraits {
  user_trait_id: number;
  clerk_id: string | null;
  life_context: any;
  stakes_level: any;
  growth_motivation: any;
  confidence_pattern: any;
  interaction_style: any;
  created_at: string | null;
  updated_at: string | null;
}

interface TraitScore {
  score: number;
  pattern: string;
  evidence: string;
}

interface TraitScores {
  [key: string]: TraitScore;
}

export function TraitsProgress({ traits }: { traits: UserTraits | null }) {
  if (!traits) return null;

  const traitScores: TraitScores = {
    "Communication": {
      score: 1.4,
      pattern: traits.interaction_style?.PATTERN || 'Not set',
      evidence: traits.interaction_style?.EVIDENCE || 'No evidence'
    },
    "Emotional Intelligence": {
      score: 2.5,
      pattern: traits.growth_motivation?.PATTERN || 'Not set',
      evidence: traits.growth_motivation?.EVIDENCE || 'No evidence'
    },
    "Conflict Resolution": {
      score: 0.8,
      pattern: traits.life_context?.PATTERN || 'Not set',
      evidence: traits.life_context?.EVIDENCE || 'No evidence'
    },
    "Adaptability": {
      score: 1.4,
      pattern: traits.stakes_level?.PATTERN || 'Not set',
      evidence: traits.stakes_level?.EVIDENCE || 'No evidence'
    },
    "Customer Focus": {
      score: 2.5,
      pattern: traits.confidence_pattern?.PATTERN || 'Not set',
      evidence: traits.confidence_pattern?.EVIDENCE || 'No evidence'
    }
  };

  const calculateProgressValue = (score: number) => {
    return (score / 5.0) * 100;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle>Your Communication Profile</CardTitle>
        <CardDescription className="text-muted-foreground">
          Assessment of your communication patterns and skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(traitScores).map(([trait, data]) => (
          <div key={trait}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">{trait}</h4>
              <span className="text-sm font-medium">{data.score.toFixed(1)}</span>
            </div>
            <div className="mb-6">
              <Progress 
                value={calculateProgressValue(data.score)}
                className="h-2 mb-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1.0</span>
                <span>2.5</span>
                <span>4.0</span>
                <span>5.0</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
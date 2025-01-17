'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Clock, Target, Activity, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SkillRoadmapProps {
  learningPath: Array<{
    skill_id: number;
    priority_level: 'critical' | 'high' | 'medium' | 'low' | 'uncategorized';
    learning_activities: string[];
    estimated_duration: number;
  }>;
  prioritizedSkills: Array<{
    skill_id: number;
    priority_score: number;
    development_stage: {
      current: string;
      target: string;
      readiness: number;
    };
  }>;
  focusedSkillIds?: number[];
  onToggleFocusSkill?: (skillId: number, skillName: string, priority: string) => void;
}

const SkillRoadmap: React.FC<SkillRoadmapProps> = ({ 
  learningPath = [], 
  prioritizedSkills = [],
  focusedSkillIds = [],
  onToggleFocusSkill
}) => {
  const [expandedSkill, setExpandedSkill] = useState<number | null>(null);

  // Early return if no data
  if (!learningPath.length || !prioritizedSkills.length) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No skill data available. Please check back later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Group skills by priority level
  const groupedSkills = learningPath.reduce((acc, skill) => {
    const priority = skill.priority_level || 'uncategorized';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(skill);
    return acc;
  }, {} as Record<string, typeof learningPath>);

  // Priority order
  const priorityOrder = ['critical', 'high', 'medium', 'low', 'uncategorized'];

  // Get priority score and development info for a skill
  const getSkillDetails = (skillId: number) => {
    return prioritizedSkills.find(s => s.skill_id === skillId) || {
      priority_score: 0,
      development_stage: {
        current: 'unknown',
        target: 'unknown',
        readiness: 0
      }
    };
  };

  // Priority level colors and descriptions
  const priorityInfo = {
    critical: {
      color: 'bg-red-500',
      description: 'Immediate attention needed - crucial for your growth'
    },
    high: {
      color: 'bg-orange-500',
      description: 'Important skills to focus on next'
    },
    medium: {
      color: 'bg-yellow-500',
      description: 'Valuable skills to develop over time'
    },
    low: {
      color: 'bg-blue-500',
      description: 'Skills to keep in mind for future development'
    },
    uncategorized: {
      color: 'bg-gray-500',
      description: 'Skills pending assessment'
    }
  };

  const renderSkillCard = (skill: SkillRoadmapProps['learningPath'][0]) => {
    if (!skill) return null;
    
    const details = getSkillDetails(skill.skill_id);
    const isExpanded = expandedSkill === skill.skill_id;
    const skillName = skill.learning_activities?.[0]?.replace('General activity for ', '') || 'Unnamed Skill';
    const isFocused = focusedSkillIds.includes(skill.skill_id);
    
    return (
      <div key={skill.skill_id} className="mb-4">
        <Card className="w-full hover:shadow-lg transition-shadow duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-3 h-3 rounded-full ${priorityInfo[skill.priority_level || 'uncategorized'].color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">
                      {skillName}
                    </h3>
                    {onToggleFocusSkill && (
                      <Button
                        variant={isFocused ? "secondary" : "default"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFocusSkill(skill.skill_id, skillName, skill.priority_level);
                        }}
                        className="min-w-[90px]"
                        disabled={!isFocused && focusedSkillIds.length >= 5}
                      >
                        {isFocused ? 'Remove' : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{skill.estimated_duration || 0} minutes</span>
                    <Target className="w-4 h-4 ml-2" />
                    <span>Score: {details.priority_score?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedSkill(isExpanded ? null : skill.skill_id)}
                  className="p-0 hover:bg-transparent"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Progress 
                value={details.development_stage?.readiness * 100 || 0}
                className="h-2"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{details.development_stage?.current || 'unknown'}</span>
                <span>{details.development_stage?.target || 'unknown'}</span>
              </div>
            </div>
          </div>

          {isExpanded && (
            <CardContent className="border-t">
              <div className="py-2">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Learning Activities
                </h4>
                {(skill.learning_activities || []).map((activity, idx) => (
                  <div 
                    key={idx}
                    className="ml-6 mb-2 text-gray-700"
                  >
                    • {activity}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Your Skill Development Journey</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(priorityInfo).map(([priority, info]) => (
            <div key={priority} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${info.color}`} />
              <div>
                <span className="font-medium capitalize">{priority}</span>
                <p className="text-sm text-gray-600">{info.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {priorityOrder.map(priority => {
        const skills = groupedSkills[priority] || [];
        if (!skills.length) return null;

        return (
          <div key={priority} className="mb-8">
            <h3 className="text-xl font-semibold mb-4 capitalize">
              {priority} Priority Skills
            </h3>
            {skills.map(renderSkillCard)}
          </div>
        );
      })}
    </div>
  );
};

const transformSkillData = (
  traits: any,
  weights: any,
  stages: any
): SkillRoadmapProps => ({
  learningPath: traits.map(trait => ({
    skill_id: trait.skill_id,
    priority_level: calculatePriorityLevel(trait, weights),
    learning_activities: trait.learning_activities,
    estimated_duration: trait.estimated_duration
  })),
  prioritizedSkills: weights.map(weight => ({
    skill_id: weight.skill_id,
    priority_score: weight.weight,
    development_stage: {
      current: stages[weight.skill_id]?.current || 'beginning',
      target: stages[weight.skill_id]?.target || 'mastering',
      readiness: weight.weight // 0-1 value from practice results
    }
  }))
});

export default SkillRoadmap; 
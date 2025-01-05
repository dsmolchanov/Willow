'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Skill {
  skill_id: number;
  name: string;
  priority_level: string;
}

interface DashboardRightRailProps {
  focusedSkills: Skill[];
  onRemoveSkill: (skillId: number) => void;
  onStartSession: () => void;
  isLoading: boolean;
}

export function DashboardRightRail({ 
  focusedSkills, 
  onRemoveSkill,
  onStartSession,
  isLoading 
}: DashboardRightRailProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-64 flex-shrink-0 p-4 border-l">
      <div className="sticky top-4">
        <div className="flex flex-col gap-4">
          <Button 
            className="w-full"
            size="lg"
            disabled={focusedSkills.length === 0 || isLoading}
            onClick={onStartSession}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </>
            )}
          </Button>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Focus Skills</h3>
              <span className="text-sm text-gray-500">
                {focusedSkills.length}/5
              </span>
            </div>

            {focusedSkills.length === 0 ? (
              <p className="text-sm text-gray-500">
                Add up to 5 skills from your skill roadmap to focus on.
              </p>
            ) : (
              <div className="space-y-3">
                {focusedSkills.map((skill) => (
                  <Card key={skill.skill_id} className="p-3 relative group hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{skill.name}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500 -mt-1 -mr-1"
                          onClick={() => onRemoveSkill(skill.skill_id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(skill.priority_level)}`} />
                        <span className="text-xs text-gray-600 capitalize">{skill.priority_level}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {focusedSkills.length > 0 && focusedSkills.length < 5 && (
              <p className="text-xs text-gray-500 mt-3">
                {5 - focusedSkills.length} more skill{5 - focusedSkills.length !== 1 ? 's' : ''} can be added
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
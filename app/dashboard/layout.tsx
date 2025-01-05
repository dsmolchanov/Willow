"use client"

import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardRightRail } from "@/components/DashboardRightRail"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from "@clerk/nextjs"

interface FocusedSkill {
  skill_id: number;
  name: string;
  priority_level: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [focusedSkills, setFocusedSkills] = useState<FocusedSkill[]>([]);
  const { user } = useUser();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const initializeFocusedSkills = async () => {
      if (!user) return;

      const { data: learningPathData } = await supabase
        .from('user_learning_paths')
        .select('learning_path, prioritized_skills')
        .eq('clerk_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!learningPathData?.learning_path || !learningPathData?.prioritized_skills) return;

      // Get the top 5 prioritized skills by score
      const topPrioritizedSkills = learningPathData.prioritized_skills
        .sort((a: any, b: any) => b.priority_score - a.priority_score)
        .slice(0, 5);

      // Find the corresponding learning path entries for these skills
      const topSkills = topPrioritizedSkills
        .map((prioritySkill: any) => {
          const learningPathSkill = learningPathData.learning_path.find(
            (lp: any) => lp.skill_id === prioritySkill.skill_id
          );
          
          if (!learningPathSkill) return null;

          return {
            skill_id: prioritySkill.skill_id,
            name: learningPathSkill.learning_activities?.[0]?.replace('General activity for ', '') || 'Unnamed Skill',
            priority_level: learningPathSkill.priority_level || 'medium'
          };
        })
        .filter(Boolean);

      setFocusedSkills(topSkills);
    };

    initializeFocusedSkills();
  }, [user]);

  const handleToggleFocusSkill = (skillId: number, skillName: string, priority: string) => {
    setFocusedSkills(prev => {
      const isCurrentlyFocused = prev.some(s => s.skill_id === skillId);
      
      if (isCurrentlyFocused) {
        return prev.filter(s => s.skill_id !== skillId);
      } else if (prev.length < 5) {
        return [...prev, { skill_id: skillId, name: skillName, priority_level: priority }];
      }
      
      return prev;
    });
  };

  const handleRemoveSkill = (skillId: number) => {
    setFocusedSkills(prev => prev.filter(s => s.skill_id !== skillId));
  };

  // Create child props
  const childProps = {
    focusedSkillIds: focusedSkills.map(s => s.skill_id),
    onToggleFocusSkill: handleToggleFocusSkill
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex p-4 sm:ml-64">
          <div className="flex-1">
            <div className="mb-4 sm:hidden">
              <SidebarTrigger />
            </div>
            {React.isValidElement(children) 
              ? React.cloneElement(children, childProps)
              : children}
          </div>
          <DashboardRightRail 
            focusedSkills={focusedSkills}
            onRemoveSkill={handleRemoveSkill}
          />
        </main>
      </SidebarProvider>
    </div>
  )
} 
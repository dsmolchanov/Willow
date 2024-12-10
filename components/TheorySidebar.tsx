"use client";

import React from 'react';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ReactMarkdown from 'react-markdown';
import { ChevronRight } from "lucide-react";
import type { Database } from "@/lib/database.types";

interface Skill {
  skill_id: number;
  name: string;
  parent_skill_id: number | null;
  level: number;
  theory: string;
  children?: Skill[];
}

export function TheorySidebar() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = React.useState<Skill | null>(null);
  const [expandedSkills, setExpandedSkills] = React.useState<Set<number>>(new Set());
  const supabase = createClientComponentClient<Database>();

  const extractNumbers = (name: string): number[] => {
    const match = name.match(/^(\d+(\.\d+)?)/);
    if (!match) return [Infinity];
    return match[1].split('.').map(num => parseInt(num));
  };

  const compareSkills = (a: Skill, b: Skill): number => {
    const numbersA = extractNumbers(a.name);
    const numbersB = extractNumbers(b.name);

    for (let i = 0; i < Math.max(numbersA.length, numbersB.length); i++) {
      const numA = numbersA[i] ?? Infinity;
      const numB = numbersB[i] ?? Infinity;

      if (numA !== numB) {
        return numA - numB;
      }
    }

    return 0;
  };

  const sortSkills = (skills: Skill[]): Skill[] => {
    return [...skills].sort(compareSkills);
  };

  React.useEffect(() => {
    const fetchSkills = async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('skill_id, name, parent_skill_id, level, new_theory')
        .order('level', { ascending: true });

      if (error) {
        console.error('Error fetching skills:', error);
        return;
      }

      const skillsMap: { [key: number]: Skill } = {};
      const rootSkills: Skill[] = [];

      data.forEach((skill: Skill) => {
        skillsMap[skill.skill_id] = { ...skill, children: [] };
      });

      data.forEach((skill: Skill) => {
        if (skill.parent_skill_id) {
          skillsMap[skill.parent_skill_id].children?.push(skillsMap[skill.skill_id]);
        } else {
          rootSkills.push(skillsMap[skill.skill_id]);
        }
      });

      Object.values(skillsMap).forEach(skill => {
        if (skill.children) {
          skill.children = sortSkills(skill.children);
        }
      });

      const sortedRootSkills = sortSkills(rootSkills);
      setSkills(sortedRootSkills);

      if (sortedRootSkills.length > 0) {
        setSelectedSkill(sortedRootSkills[0]);
      }
    };

    fetchSkills();
  }, [supabase]);

  const toggleExpand = (skillId: number) => {
    setExpandedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    if (skill.children && skill.children.length > 0) {
      toggleExpand(skill.skill_id);
    }
  };

  const renderSkills = (skills: Skill[]) => {
    return skills.map(skill => (
      <div key={skill.skill_id} className="mb-2">
        <button 
          onClick={() => handleSkillClick(skill)}
          className={`w-full flex items-center justify-between rounded-lg hover:bg-gray-100 group ${
            selectedSkill?.skill_id === skill.skill_id ? 'bg-gray-100' : ''
          }`}
        >
          <span className={`text-left flex-grow p-2 ${
            selectedSkill?.skill_id === skill.skill_id ? 'font-medium' : ''
          }`}>
            {skill.name}
          </span>
          <div className="flex-shrink-0 w-6 h-6">
            {skill.children && skill.children.length > 0 && (
              <ChevronRight 
                className={`w-full h-full text-gray-400 transition-all duration-200
                  group-hover:text-gray-600 ${
                  expandedSkills.has(skill.skill_id) ? 'rotate-90' : ''
                }`}
              />
            )}
          </div>
        </button>
        {expandedSkills.has(skill.skill_id) && skill.children && (
          <div className="ml-4 mt-1 border-l-2 border-gray-200 pl-2">
            {renderSkills(skill.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
        {renderSkills(skills)}
      </div>
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        {selectedSkill && (
          <div className="prose prose-lg max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">
              {selectedSkill.name}
            </h2>
            
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => (
                  <h1 className="text-2xl font-bold mt-8 mb-4 text-gray-900" {...props} />
                ),
                h2: ({node, ...props}) => (
                  <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800" {...props} />
                ),
                h3: ({node, ...props}) => (
                  <h3 className="text-lg font-medium mt-4 mb-2 text-gray-700" {...props} />
                ),
                h4: ({node, ...props}) => (
                  <h4 className="text-base font-medium mt-3 mb-2 text-gray-600" {...props} />
                ),
                p: ({node, ...props}) => (
                  <p className="my-4 text-gray-600 leading-relaxed" {...props} />
                ),
                ul: ({node, ...props}) => (
                  <ul className="my-4 list-disc list-inside space-y-2" {...props} />
                ),
                ol: ({node, ...props}) => (
                  <ol className="my-4 list-decimal list-inside space-y-2" {...props} />
                ),
                li: ({node, ...props}) => (
                  <li className="text-gray-600 ml-4" {...props} />
                ),
                strong: ({node, ...props}) => (
                  <strong className="font-semibold text-gray-900" {...props} />
                ),
                em: ({node, ...props}) => (
                  <em className="italic text-gray-700" {...props} />
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600" {...props} />
                ),
              }}
              className="mt-6"
            >
              {selectedSkill.new_theory}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
} 
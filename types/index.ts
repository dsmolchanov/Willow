export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ScenarioInfo {
  scenario_id: number;
  title: string;
  skill_ids: number[];
  type: 'lesson' | 'onboarding';
} 
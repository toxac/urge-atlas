// types/playbook.ts

// 1. STANDALONE ENUMS & LITERAL TYPES
export type ExecutionType =
  | "standard-form"
  | "simulator"
  | "off-task-action"
  | "observation-form"
  | "dashboard-view"
  | "log_counter"
  | "decision_gate";

export type ReferenceType =
  | "insights"
  | "guide"
  | "tools"
  | "youtube"
  | "podcast"
  | "book"
  | "other";

export type NoteType = "requirement" | "warning" | "guide" | "nudge";

// 2. BASE TABLE ROW INTERFACES
export interface MissionRow {
  id: string;
  title: string;
  content: string | null;
  content_path: string;
  sequence: number;
  video_url: string | null;
  big_question: string | null;
  estimated_time_in_days: number;
  context: any;
  success_message: string;
  badge_config: any;
  created_at: string;
  updated_at: string;
}

export interface QuestRow {
  id: string;
  mission_id: string;
  title: string;
  content_path: string;
  video_url: string | null;
  sequence: number;
  estimated_in_app_minutes: number;
  estimated_off_app_minutes: number;
  content: string | null;
  context: any;
  badge_config: any;
  notes: any;
  success_message: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  title: string;
  sequence: number;
  execution_type: ExecutionType;
  estimated_minutes: number;
  briefing_text: string;
  mission_id: string;
  quest_id: string;
  execution_environment: string | null;
  checkback_delay_days: number | null;
  recurring: boolean | null;
  interval: number | null;
  resources: any;
  component_key: string;
  reflection_prompt: string | null;
  observation_context: any;
  grant_points: number;
  challenges: any;
  ai_config: any;
  dependencies: string[] | null;
  target_count: number | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// 3. PLAYBOOK CONFIGURATIONS & COMPOSITE TYPES
export type BadgeConfig = {
  key: string;
  title: string;
  description: string;
  unlocked_identity: string;
  icon_key: string;
};

export type NoteSchema = {
  title: string;
  type: NoteType;
  content: string;
  related_url: string | null;
};

export type ChallengeSchema = {
  title: string;
  description: string;
  link: string;
};

export type ReferenceSchema = {
  type: ReferenceType;
  isInternal: boolean;
  isRequired: boolean;
  url_link: string;
  title: string;
};

export type AIConfigSchema = {
  role: string;
  persona_name: string;
  persona_prompt: string;
  required_context: string[] | null;
};

export type ObservationContextSchema = {
  category: string;
  reference: string;
};

export type TaskMetadata = {
  scenarios?: string[];
  [key: string]: any;
};

// 4. COMBINED TYPED SCHEMAS FOR APPLICATION RENDERING & PLAYBOOK DATA
export type TaskSchema = Omit<
  TaskRow,
  'resources' | 'observation_context' | 'on_success' | 'challenges' | 'ai_config' | 'metadata'
> & {
  resources: ReferenceSchema[];
  observation_context: ObservationContextSchema | null;
  grant_points: number;
  challenges: ChallengeSchema[] | null;
  ai_config: AIConfigSchema | null;
  metadata?: TaskMetadata;
};

export type QuestSchema = Omit<
  QuestRow,
  'context' | 'on_success' | 'notes'
> & {
  context: string[] | null;
  badge_config: BadgeConfig | null;
  notes: NoteSchema[] | null;
  tasks: TaskSchema[];
};

export type MissionSchema = Omit<
  MissionRow,
  'context'
> & {
  context: string[];
  badge_config: BadgeConfig | null;
  quests: QuestSchema[];
};

export type PlaybookConfig = Record<string, MissionSchema>;
// The different states our engine can be in
export type EngineState = 'IDLE' | 'SPEAKING' | 'LISTENING' | 'PROCESSING' | 'SAVING' | 'COMPLETE';

// A single step in the conversation flow
export interface ConversationNode {
  id: string;                // e.g., 'intro', 'collect_why', 'ask_deeper'
  type: 'SPEAK' | 'LISTEN' | 'PROCESS_RULE' | 'PROCESS_AI' | 'SAVE' | 'COMPLETE';
  content?: string;          // Text for SPEAK nodes
  field?: string;            // Where to store LISTEN results (e.g., 'why_raw')
  rule?: (data: any) => boolean | string; // For PROCESS_RULE: returns true for YES, false for NO, or string for specific branch
  next?: string;             // Default next node ID
  nextYes?: string;          // Node ID if rule returns true
  nextNo?: string;           // Node ID if rule returns false
  aiPrompt?: string;         // Prompt template for PROCESS_AI nodes
  saveTo?: string;           // Table/field for SAVE nodes
}

// The full state persisted in SQLite
export interface SessionState {
  sessionId: string;         // 'mission1_quest1'
  currentTaskId: string;     // 'task_1_1'
  currentNodeIndex: number;  // Index in the task flow array
  taskData: Record<string, any>; // Accumulated user answers
  completedTasks: string[];  // ['task_1_1', ...]
  updatedAt: string;
}

// The task definition
export interface TaskFlow {
  id: string;
  title: string;
  nodes: ConversationNode[];
}
// lib/conversation/engine/taskFlows.ts

export interface TaskDefinition {
  id: string;
  title: string;
  missionName: string;
  initialPrompt: string;
  schemaGoal: {
    targetFields: string[]; // e.g. ['core_driver', 'lifestyle_vision']
    description: string;
  };
  coachingGuidance: string;
}

export const task1_1_WhyStart: TaskDefinition = {
  id: 'task_1_1',
  title: 'Why Start?',
  missionName: 'Beg. Borrow. Steal.',
  initialPrompt:
    "Let's get completely honest. Building a company takes relentless energy. What is the actual, uncensored change you want to make in your life right now?",
  schemaGoal: {
    targetFields: ['core_driver', 'lifestyle_vision'],
    description: 'Extract the root motivation (autonomy, wealth, impact, escape) and what success looks like in daily life.',
  },
  coachingGuidance:
    "If the answer is generic like 'I want freedom' or 'To make money', push them to be specific. Ask what freedom looks like on a Tuesday morning.",
};
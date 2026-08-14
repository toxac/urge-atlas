import { TaskFlow } from './types';

export const task1_1_WhyStart: TaskFlow = {
  id: 'task_1_1',
  title: 'Why Start?',
  nodes: [
    // Node 0
    {
      id: 'intro',
      type: 'SPEAK',
      content: "Atlas here. Let's be totally honest. Building a business takes serious energy. What is the actual change you want to make in your life?",
      next: 'collect_why'
    },
    // Node 1
    {
      id: 'collect_why',
      type: 'LISTEN',
      field: 'why_raw',
      next: 'check_depth'
    },
    // Node 2
    {
      id: 'check_depth',
      type: 'PROCESS_RULE',
      rule: (data) => {
        const words = data.why_raw?.split(' ')?.length || 0;
        return words > 15; // True if deep enough
      },
      nextYes: 'reflect_start',
      nextNo: 'ask_deeper'
    },
    // Node 3
    {
      id: 'ask_deeper',
      type: 'SPEAK',
      content: "That's a great start, but let's go deeper. What does achieving that actually look like in your daily life?",
      next: 'collect_deeper'
    },
    // Node 4
    {
      id: 'collect_deeper',
      type: 'LISTEN',
      field: 'why_refined',
      next: 'ai_summarize'
    },
    // Node 5 (Fallback if first answer was deep enough, we still want to summarize but skip the probe)
    {
      id: 'reflect_start',
      type: 'SPEAK',
      content: "Powerful. Let me summarize what I'm hearing so we can lock it in.",
      next: 'ai_summarize'
    },
    // Node 6 - AI Call
    {
      id: 'ai_summarize',
      type: 'PROCESS_AI',
      aiPrompt: `Summarize this founder's "why" into one powerful, actionable sentence. If they gave multiple reasons, combine them. Transcript: {transcript}`,
      field: 'why_summary', // Stores AI result
      next: 'present_summary'
    },
    // Node 7
    {
      id: 'present_summary',
      type: 'SPEAK',
      content: `Here's what I heard: "{why_summary}". Does that resonate with you on a gut level?`,
      next: 'collect_reflection'
    },
    // Node 8
    {
      id: 'collect_reflection',
      type: 'LISTEN',
      field: 'reflection_task1',
      next: 'save_task'
    },
    // Node 9
    {
      id: 'save_task',
      type: 'SAVE',
      saveTo: 'task_results',
      next: 'complete'
    },
    // Node 10
    {
      id: 'complete',
      type: 'COMPLETE',
      content: "Great work. You've defined your 'why.' On to the next quest.",
    }
  ]
};

// We'll add Task 1.2 and 1.3 here later.
export const quest1Flows = [task1_1_WhyStart];
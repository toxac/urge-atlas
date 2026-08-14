// lib/conversation/engine/taskFlows.ts

import { TaskFlow } from './types';

export const task1_1_WhyStart: TaskFlow = {
  id: 'task_1_1',
  title: 'Why Start?',
  nodes: [
    // NEW: Welcome intro node
    {
      id: 'welcome',
      type: 'SPEAK',
      content: `Welcome to Atlas, your startup co-pilot. 

This is Mission 1: Beg. Borrow. Steel. 

You're about to define your real "why" — the honest reason you want to start a business. Not the polished version you'd tell investors. The real one.

We'll do this in 3 short tasks. This is Task 1: Why Start?

When I ask you a question, you'll see a green pulse on the orb. That means it's your turn to speak or type.

Ready? Let's begin.`,
      next: 'intro'
    },
    // Original intro (modified slightly)
    {
      id: 'intro',
      type: 'SPEAK',
      content: "Let's be totally honest. Building a business takes serious energy. What is the actual change you want to make in your life?",
      next: 'collect_why'
    },
    {
      id: 'collect_why',
      type: 'LISTEN',
      field: 'why_raw',
      next: 'check_depth'
    },
    {
      id: 'check_depth',
      type: 'PROCESS_RULE',
      rule: (data) => {
        const words = data.why_raw?.split(' ')?.length || 0;
        return words > 15;
      },
      nextYes: 'ai_summarize',
      nextNo: 'ask_deeper'
    },
    {
      id: 'ask_deeper',
      type: 'SPEAK',
      content: "That's a great start, but let's go deeper. What does achieving that actually look like in your daily life?",
      next: 'collect_deeper'
    },
    {
      id: 'collect_deeper',
      type: 'LISTEN',
      field: 'why_refined',
      next: 'reflect_start'
    },
    {
      id: 'reflect_start',
      type: 'SPEAK',
      content: "Powerful. Let me summarize what I'm hearing so we can lock it in.",
      next: 'ai_summarize'
    },
    {
      id: 'ai_summarize',
      type: 'PROCESS_AI',
      aiPrompt: `Summarize this founder's "why" into one powerful, actionable sentence. If they gave multiple reasons, combine them. Transcript: {transcript}`,
      field: 'why_summary',
      next: 'present_summary'
    },
    {
      id: 'present_summary',
      type: 'SPEAK',
      content: "Here's what I heard: \"{why_summary}\". Does that resonate with you on a gut level?",
      next: 'collect_reflection'
    },
    {
      id: 'collect_reflection',
      type: 'LISTEN',
      field: 'reflection_task1',
      next: 'save_task'
    },
    {
      id: 'save_task',
      type: 'SAVE',
      saveTo: 'task_results',
      next: 'complete'
    },
    {
      id: 'complete',
      type: 'SPEAK',
      content: "Great work. You've defined your 'why.' That's more than most people ever do. Ready for Task 2?",
      next: 'done'
    },
    {
      id: 'done',
      type: 'COMPLETE'
    }
  ]
};

export const quest1Flows = [task1_1_WhyStart];
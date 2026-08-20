import { assign, createMachine, fromPromise } from 'xstate';
import { QuestSchema, TaskSchema } from '../../../types/playbook';
import { ConversationMessage, DeepSeekService, TurnAnalysis } from '../services/DeepSeekService';
import { playbookAdapter } from './PlaybookAdapter';

export interface PlaybookContext {
  taskIndex: number;
  currentQuest: QuestSchema;
  currentTask: TaskSchema;
  history: ConversationMessage[];
  userInput: string;
  atlasResponse: string;
  collectedAnswers: Record<string, any>;
  isTaskComplete: boolean;
}

export type PlaybookEvent =
  | { type: 'START' }
  | { type: 'SPEECH_FINISHED' }
  | { type: 'SUBMIT_INPUT'; text: string }
  | { type: 'NEXT_TASK' }
  | { type: 'RESET' };

const firstTaskData = playbookAdapter.getTask(0)!;

export const adaptiveConversationMachine = createMachine({
  id: 'quest1Demo',
  initial: 'idle',
  types: {} as {
    context: PlaybookContext;
    events: PlaybookEvent;
  },
  context: {
    taskIndex: 0,
    currentQuest: firstTaskData.quest,
    currentTask: firstTaskData.task,
    history: [],
    userInput: '',
    atlasResponse: firstTaskData.task.briefing_text,
    collectedAnswers: {},
    isTaskComplete: false,
  },
  states: {
    idle: {
      on: { START: 'speakingPrompt' },
    },
    speakingPrompt: {
      on: {
        SPEECH_FINISHED: 'listening',
      },
    },
    listening: {
      on: {
        SUBMIT_INPUT: {
          target: 'processingTurn',
          actions: assign({
            userInput: ({ event }) => event.text,
            history: ({ context, event }) => [
              ...context.history,
              { role: 'user' as const, content: event.text },
            ],
          }),
        },
      },
    },
    processingTurn: {
      invoke: {
        src: fromPromise(
          async ({
            input,
          }: {
            input: {
              task: TaskSchema;
              quest: QuestSchema;
              history: ConversationMessage[];
              userInput: string;
            };
          }): Promise<TurnAnalysis> => {
            return await DeepSeekService.processTurn(
              input.task,
              input.quest,
              input.history,
              input.userInput
            );
          }
        ),
        input: ({ context }) => ({
          task: context.currentTask,
          quest: context.currentQuest,
          history: context.history,
          userInput: context.userInput,
        }),
        onDone: {
          target: 'speakingFeedback',
          actions: assign({
            atlasResponse: ({ event }) => event.output.atlasSpokenResponse,
            isTaskComplete: ({ event }) => event.output.isTaskComplete,
            collectedAnswers: ({ context, event }) => ({
              ...context.collectedAnswers,
              ...event.output.extractedFields,
            }),
            history: ({ context, event }) => [
              ...context.history,
              { role: 'assistant' as const, content: event.output.atlasSpokenResponse },
            ],
          }),
        },
        onError: {
          target: 'speakingFeedback',
          actions: assign({
            atlasResponse: "Got it. Let's move to the next step.",
            isTaskComplete: () => true,
          }),
        },
      },
    },
    speakingFeedback: {
      on: {
        SPEECH_FINISHED: [
          {
            // Task needs follow-up -> back to listening
            guard: ({ context }) => !context.isTaskComplete,
            target: 'listening',
          },
          {
            // Task is complete, more tasks remain in quest
            guard: ({ context }) => playbookAdapter.getTask(context.taskIndex + 1) !== null,
            target: 'taskCompleted',
          },
          {
            // All tasks in quest complete
            target: 'questCompleted',
            actions: assign(({ context }) => ({
              atlasResponse: context.currentQuest.success_message,
            })),
          },
        ],
      },
    },
    taskCompleted: {
      on: {
        NEXT_TASK: {
          target: 'speakingPrompt',
          actions: assign(({ context }) => {
            const nextData = playbookAdapter.getTask(context.taskIndex + 1)!;
            return {
              taskIndex: context.taskIndex + 1,
              currentTask: nextData.task,
              atlasResponse: nextData.task.briefing_text,
              history: [],
              isTaskComplete: false,
            };
          }),
        },
      },
    },
    questCompleted: {
      type: 'final',
    },
  },
  on: {
    RESET: {
      target: '.idle',
      actions: assign(() => {
        const resetData = playbookAdapter.getTask(0)!;
        return {
          taskIndex: 0,
          currentQuest: resetData.quest,
          currentTask: resetData.task,
          history: [],
          userInput: '',
          atlasResponse: resetData.task.briefing_text,
          collectedAnswers: {},
          isTaskComplete: false,
        };
      }),
    },
  },
});
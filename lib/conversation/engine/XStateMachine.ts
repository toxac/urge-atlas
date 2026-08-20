import { assign, createMachine, fromPromise } from 'xstate';
import { ConversationMessage, DeepSeekService, TurnAnalysis } from '../services/DeepSeekService';
import { StorageService } from '../services/StorageService';
import { task1_1_WhyStart, TaskDefinition } from './taskFlows';

export interface AdaptiveContext {
  task: TaskDefinition;
  history: ConversationMessage[];
  userInput: string;
  atlasResponse: string;
  accumulatedData: Record<string, any>;
  turnCount: number;
}

export type AdaptiveEvent =
  | { type: 'START' }
  | { type: 'SPEECH_FINISHED' }
  | { type: 'SUBMIT_INPUT'; text: string }
  | { type: 'RESET' };

export const adaptiveConversationMachine = createMachine({
  id: 'adaptiveConversation',
  initial: 'idle',
  types: {} as {
    context: AdaptiveContext;
    events: AdaptiveEvent;
  },
  context: {
    task: task1_1_WhyStart,
    history: [],
    userInput: '',
    atlasResponse: task1_1_WhyStart.initialPrompt,
    accumulatedData: {},
    turnCount: 0,
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
              task: TaskDefinition;
              history: ConversationMessage[];
              userInput: string;
            };
          }): Promise<TurnAnalysis> => {
            return await DeepSeekService.processTurn(
              input.task,
              input.history,
              input.userInput
            );
          }
        ),
        input: ({ context }) => ({
          task: context.task,
          history: context.history,
          userInput: context.userInput,
        }),
        onDone: [
          {
            // Branch 1: Task Complete -> Save and finish
            guard: ({ event }) => event.output.isTaskComplete,
            target: 'savingAndCompleting',
            actions: assign({
              atlasResponse: ({ event }) => event.output.atlasSpokenResponse,
              accumulatedData: ({ context, event }) => ({
                ...context.accumulatedData,
                ...event.output.extractedFields,
              }),
              history: ({ context, event }) => [
                ...context.history,
                { role: 'assistant' as const, content: event.output.atlasSpokenResponse },
              ],
            }),
          },
          {
            // Branch 2: Needs deeper probing or answering question -> Loop back
            target: 'speakingPrompt',
            actions: assign({
              atlasResponse: ({ event }) => event.output.atlasSpokenResponse,
              accumulatedData: ({ context, event }) => ({
                ...context.accumulatedData,
                ...event.output.extractedFields,
              }),
              history: ({ context, event }) => [
                ...context.history,
                { role: 'assistant' as const, content: event.output.atlasSpokenResponse },
              ],
              turnCount: ({ context }) => context.turnCount + 1,
            }),
          },
        ],
        onError: {
          target: 'speakingPrompt',
          actions: assign({
            atlasResponse: "Let's capture what you just said and move forward.",
          }),
        },
      },
    },
    savingAndCompleting: {
      invoke: {
        src: fromPromise(
          async ({
            input,
          }: {
            input: { taskId: string; data: Record<string, any> };
          }) => {
            await StorageService.saveSession({
              sessionId: 'mission1_quest1',
              currentTaskId: input.taskId,
              currentNodeIndex: 99,
              taskData: input.data,
              completedTasks: [input.taskId],
              updatedAt: new Date().toISOString(),
            });
          }
        ),
        input: ({ context }) => ({
          taskId: context.task.id,
          data: context.accumulatedData,
        }),
        onDone: 'completed',
        onError: 'completed',
      },
    },
    completed: {
      type: 'final',
    },
  },
  on: {
    RESET: 'idle',
  },
});
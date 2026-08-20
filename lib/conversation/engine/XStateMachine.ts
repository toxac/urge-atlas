import { assign, createMachine, fromPromise } from 'xstate';
import { DeepSeekService, MotivationFormData, MotivationStep, MotivationTurnResult } from '../services/DeepSeekService';

export interface Task1Context {
  currentStep: MotivationStep;
  stepIndex: number;
  userInput: string;
  atlasResponse: string;
  formData: Partial<MotivationFormData>;
}

export type Task1Event =
  | { type: 'START' }
  | { type: 'SPEECH_FINISHED' }
  | { type: 'SUBMIT_INPUT'; text: string }
  | { type: 'RESET' };

const STEP_PROMPTS: Record<MotivationStep, string> = {
  push: "Let's be totally honest. What is the actual situation or pain you're running away from right now?",
  pull: "Now, what is the clear vision or future you are running toward?",
  urgency: "Why today? What makes right now the urgent moment to make this leap?",
  why_statement: "Lastly, bring it all together. What is your 1-sentence founder manifesto?",
};

export const task1MotivationMachine = createMachine({
  id: 'task1Motivation',
  initial: 'idle',
  types: {} as {
    context: Task1Context;
    events: Task1Event;
  },
  context: {
    currentStep: 'push',
    stepIndex: 0,
    userInput: '',
    atlasResponse: STEP_PROMPTS.push,
    formData: {},
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
              step: MotivationStep;
              userInput: string;
              formData: Partial<MotivationFormData>;
            };
          }): Promise<MotivationTurnResult> => {
            return await DeepSeekService.processMotivationStep(
              input.step,
              input.userInput,
              input.formData
            );
          }
        ),
        input: ({ context }) => ({
          step: context.currentStep,
          userInput: context.userInput,
          formData: context.formData,
        }),
        onDone: {
          target: 'speakingFeedback',
          actions: assign({
            atlasResponse: ({ event }) => event.output.atlasSpokenResponse,
            formData: ({ context, event }) => ({
              ...context.formData,
              [event.output.extractedValue.key]: event.output.extractedValue.value,
            }),
          }),
        },
        onError: {
          target: 'speakingFeedback',
          actions: assign({
            atlasResponse: "I've recorded that. Let's move to the next question.",
          }),
        },
      },
    },
    speakingFeedback: {
      on: {
        SPEECH_FINISHED: [
          {
            guard: ({ context }) => context.currentStep === 'push',
            target: 'speakingPrompt',
            actions: assign({
              currentStep: 'pull',
              stepIndex: 1,
              atlasResponse: STEP_PROMPTS.pull,
            }),
          },
          {
            guard: ({ context }) => context.currentStep === 'pull',
            target: 'speakingPrompt',
            actions: assign({
              currentStep: 'urgency',
              stepIndex: 2,
              atlasResponse: STEP_PROMPTS.urgency,
            }),
          },
          {
            guard: ({ context }) => context.currentStep === 'urgency',
            target: 'speakingPrompt',
            actions: assign({
              currentStep: 'why_statement',
              stepIndex: 3,
              atlasResponse: STEP_PROMPTS.why_statement,
            }),
          },
          {
            target: 'taskCompleted',
          },
        ],
      },
    },
    taskCompleted: {
      type: 'final',
    },
  },
  on: {
    RESET: {
      target: '.idle',
      actions: assign({
        currentStep: 'push',
        stepIndex: 0,
        userInput: '',
        atlasResponse: STEP_PROMPTS.push,
        formData: {},
      }),
    },
  },
});
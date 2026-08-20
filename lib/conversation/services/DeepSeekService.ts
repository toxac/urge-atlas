import axios from 'axios';

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export type MotivationStep = 'push' | 'pull' | 'urgency' | 'why_statement';

export interface MotivationFormData {
  push: string;
  push_other?: string;
  pull: string;
  pull_other?: string;
  urgency: string;
  urgency_other?: string;
  why_statement: string;
}

export interface MotivationTurnResult {
  atlasSpokenResponse: string;
  extractedValue: { key: string; value: string };
  isStepValid: boolean;
}

export const DeepSeekService = {
  async processMotivationStep(
    step: MotivationStep,
    userInput: string,
    currentFormData: Partial<MotivationFormData>
  ): Promise<MotivationTurnResult> {
    if (!DEEPSEEK_API_KEY) {
      // Fallback if API Key is missing
      const fallbackMap: Record<MotivationStep, { key: string; val: string; nextSpoken: string }> = {
        push: { key: 'push', val: 'autonomy', nextSpoken: "Understood. Now, what is the vision or outcome you are running toward?" },
        pull: { key: 'pull', val: 'wealth', nextSpoken: "Powerful. What makes right now the urgent moment to start?" },
        urgency: { key: 'urgency', val: 'patience', nextSpoken: "Awesome. Lastly, give me your 1-sentence founder manifesto." },
        why_statement: { key: 'why_statement', val: userInput, nextSpoken: "Your motivation dossier is locked in!" },
      };

      const res = fallbackMap[step];
      return {
        atlasSpokenResponse: res.nextSpoken,
        extractedValue: { key: res.key, value: res.val },
        isStepValid: true,
      };
    }

    const prompts: Record<MotivationStep, string> = {
      push: `
You are evaluating Question 1 of MotivationForm: "What are you running from?" (Push Driver).
Map the user's spoken answer to ONE of these valid form enum values:
['boss', 'toxic', 'paycheck', 'dead_end', 'potential', 'autonomy', 'other'].
If 'other', provide a brief custom summary in 'push_other'.

In 'atlasSpokenResponse', validate their push driver in 1 short sentence, then ask: "Now, what is the vision or future you are running toward?"
`,
      pull: `
You are evaluating Question 2 of MotivationForm: "What are you running toward?" (Pull Driver).
Map the user's spoken answer to ONE of these valid form enum values:
['wealth', 'meaning', 'time', 'prove', 'legacy', 'community', 'other'].
If 'other', provide a brief custom summary in 'pull_other'.

In 'atlasSpokenResponse', validate their pull driver in 1 short sentence, then ask: "What makes right now the urgent moment to start?"
`,
      urgency: `
You are evaluating Question 3 of MotivationForm: "Why do you want to start now?" (Urgency Catalyst).
Map the user's spoken answer to ONE of these valid form enum values:
['financial_cliff', 'life_change', 'deadline', 'market', 'patience', 'age', 'other'].
If 'other', provide a brief custom summary in 'urgency_other'.

In 'atlasSpokenResponse', validate their urgency in 1 short sentence, then ask: "Lastly, synthesize this into your 1-sentence founder manifesto. What is your anchor statement?"
`,
      why_statement: `
You are evaluating Question 4 of MotivationForm: "Your one-sentence founder manifesto" (why_statement).
Format the user's answer into a crisp, powerful 1-sentence manifesto statement.

Current accumulated context:
Push: ${currentFormData.push}
Pull: ${currentFormData.pull}
Urgency: ${currentFormData.urgency}

In 'atlasSpokenResponse', validate their manifesto in 1 short sentence and confirm that their Motivation Dossier is locked in!
`,
    };

    const systemPrompt = `
You are Atlas, an executive founder coach guiding an entrepreneur through Task 1: MotivationForm.
${prompts[step]}

Respond STRICTLY in JSON:
{
  "atlasSpokenResponse": "Spoken feedback back to founder",
  "extractedValue": { "key": "${step}", "value": "mapped_enum_or_formatted_text" },
  "isStepValid": true
}`;

    try {
      const response = await axios.post(
        API_URL,
        {
          model: 'deepseek-chat',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('DeepSeek Motivation Extraction Error:', error);
      return {
        atlasSpokenResponse: "Got it! Let's continue.",
        extractedValue: { key: step, value: userInput },
        isStepValid: true,
      };
    }
  },
};
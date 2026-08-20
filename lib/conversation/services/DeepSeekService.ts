import axios from 'axios';
import { QuestSchema, TaskSchema } from '../../../types/playbook';

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface TurnAnalysis {
  atlasSpokenResponse: string;
  extractedFields: Record<string, any>;
  isTaskComplete: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const DeepSeekService = {
  async processTurn(
    task: TaskSchema,
    quest: QuestSchema,
    history: ConversationMessage[],
    latestInput: string
  ): Promise<TurnAnalysis> {
    if (!DEEPSEEK_API_KEY) {
      return {
        atlasSpokenResponse: `Got it. I've recorded your insight for "${task.title}". Let's keep moving.`,
        extractedFields: { [task.id]: latestInput },
        isTaskComplete: true,
      };
    }

    const systemPrompt = `
You are Atlas, an empathetic executive founder coach helping a first-time entrepreneur.

Current Quest: "${quest.title}"
Current Task: "${task.title}"
Briefing: "${task.briefing_text}"
Reflection Prompt: "${task.reflection_prompt}"

INSTRUCTIONS:
1. Evaluate if the founder gave a genuine, thoughtful response.
2. If their response is generic or ultra-short (e.g. "to make money" or "idk"), ask ONE sharp, encouraging follow-up to pull out their personal truth. Set "isTaskComplete": false.
3. If their answer is clear and honest, give a 1-2 sentence validation highlighting their core insight. Set "isTaskComplete": true.

RULES:
- Maximum 2 spoken sentences.
- Speak naturally like a supportive mentor, not an AI template.

Respond ONLY in valid JSON:
{
  "atlasSpokenResponse": "Your spoken feedback back to the user",
  "extractedFields": { "${task.id}": "clean, formatted summary of their answer" },
  "isTaskComplete": boolean
}`;

    try {
      const response = await axios.post(
        API_URL,
        {
          model: 'deepseek-chat',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: latestInput },
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
      console.error('DeepSeek Turn Processing Error:', error);
      return {
        atlasSpokenResponse: "Awesome. I've noted that down. Let's head to the next step.",
        extractedFields: { [task.id]: latestInput },
        isTaskComplete: true,
      };
    }
  },
};
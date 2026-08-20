import axios from 'axios';
import { TaskDefinition } from '../engine/taskFlows';

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface TurnAnalysis {
  atlasSpokenResponse: string;
  extractedFields: Record<string, string>;
  isTaskComplete: boolean;
  action: 'PROBE' | 'ADVANCE' | 'ANSWER_AND_STEER';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const DeepSeekService = {
  async processTurn(
    task: TaskDefinition,
    conversationHistory: ConversationMessage[],
    latestInput: string
  ): Promise<TurnAnalysis> {
    if (!DEEPSEEK_API_KEY) {
      return {
        atlasSpokenResponse: `Got it. You're driven by "${latestInput}". Let's lock that in.`,
        extractedFields: { core_driver: latestInput },
        isTaskComplete: true,
        action: 'ADVANCE',
      };
    }

    const systemPrompt = `
You are Atlas, an elite, empathetic founder co-pilot.
Current Task: "${task.title}" (${task.missionName})
Goal Description: ${task.schemaGoal.description}
Target Fields Needed: ${task.schemaGoal.targetFields.join(', ')}
Coaching Guidance: ${task.coachingGuidance}

Instructions:
1. Analyze the user's latest spoken input in the context of the conversation history.
2. Determine if the user gave a deep, specific answer that satisfies the target fields.
   - If shallow/vague: Set action to "PROBE". Give a warm, sharp 1-2 sentence follow-up that gets them to go deeper.
   - If complete: Set action to "ADVANCE". Validate their vision with high-value insight (1-2 sentences), extract the structured data, and set isTaskComplete to true.
   - If user asked a side question: Set action to "ANSWER_AND_STEER". Answer concisely, then steer back to the task.

Respond ONLY in valid JSON matching this interface:
{
  "atlasSpokenResponse": "Spoken text back to user",
  "extractedFields": { "field_name": "extracted concise summary" },
  "isTaskComplete": boolean,
  "action": "PROBE" | "ADVANCE" | "ANSWER_AND_STEER"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: latestInput },
    ];

    try {
      const response = await axios.post(
        API_URL,
        {
          model: 'deepseek-chat',
          response_format: { type: 'json_object' },
          messages,
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
        atlasSpokenResponse: "That's a solid start. Let's capture that momentum and move to the next step.",
        extractedFields: { core_driver: latestInput },
        isTaskComplete: true,
        action: 'ADVANCE',
      };
    }
  },
};
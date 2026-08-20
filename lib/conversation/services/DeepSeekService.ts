// lib/conversation/services/DeepSeekService.ts
import axios from 'axios';

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export const DeepSeekService = {
  async summarize(prompt: string, transcript: string): Promise<string> {
    if (!DEEPSEEK_API_KEY) {
      console.warn('⚠️ DeepSeek API key missing. Using fallback.');
      return `You want to start a business because: "${transcript.substring(0, 100)}..."`;
    }

    try {
      const response = await axios.post(
        API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are Atlas, a supportive startup coach. Keep responses concise, actionable, and empathetic.' },
            { role: 'user', content: prompt.replace('{transcript}', transcript) }
          ],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
        }
      );
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return `You want to start a business because: "${transcript.substring(0, 100)}..."`;
    }
  }
};
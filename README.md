I am developing an POC app for first time entrepreneurs. The app is a voice version of web app which helps users start a business through series of quests and task organized in a sequence of mission. I have it working now but it needs lot of improvement.

# Key App Features
- App have to follow the logical and structural approach of the program planned in webapp.
- program is structured as playbook which defines each mission -> quest -> task. This app will turn this types form based approach into a conversational one. 
- Tech considerations
   - I am using react-navtive expo to build the app
   - I want to use on-device text-to-speech and speech-to-text on both android and Ios
   - Only if native stt and tts does not deliver quality result i want to switch to small on device models
- Current Flow:
   - I am just testing one quest first missiom, first quest
   - flow: 
      1. the conversational bot sets up the quest/task and outlines what users have to do
      2. Asks user the question
      3. Converts users voice response into text based on the original form schema
      4. Confirms user response and respond back with more insight (ai/deepseek api) and saves the data.
      5. I also want to provide text input/editing fallback 
- Current Issues:
   1. the content seems very robotic and bot does nbot seem to add any values from llm
   2. the bot animation is not good. does not seem to track the state (bot speaking, user speaking, listening, processing, AI Call, saving)
   3. the taskflow needs to be drastically made more exciting
   4. We can use something like x-state for better responsive state 
   5. Bot animation should be more fun maybe just have a orb which shrinks and grows in radius based on speech and changes color based on state

## Current Setup
- refer to attached package.json

## App folder Structure
- app/_layout.tsx
- app/index.tsx
- lib/conversation/engine/StateMachine.ts
- lib/conversation/engine/taskFlows.ts
- lib/conversation/engine/types.ts
- lib/conversation/services/DeepSeekService.ts
- lib/conversation/services/StorageService.ts


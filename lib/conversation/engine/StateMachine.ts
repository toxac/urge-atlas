// app/conversation/engine/StateMachine.ts

import { DeepSeekService } from '../services/DeepSeekService';
import { StorageService } from '../services/StorageService';
import { task1_1_WhyStart } from './taskFlows';
import { ConversationNode, SessionState, TaskFlow } from './types';

export class StateMachine {
  private currentState: SessionState | null = null;
  private currentFlow: TaskFlow | null = null;
  private currentNodeIndex: number = 0;
  private onStateChange: ((state: string, data?: any) => void) | null = null;
  private onSpeak: ((text: string) => void) | null = null;
  private onListen: (() => Promise<string>) | null = null;

  // Initialize with callbacks
  initialize(
    speakCallback: (text: string) => void,
    listenCallback: () => Promise<string>
  ) {
    this.onSpeak = speakCallback;
    this.onListen = listenCallback;
  }

  // Load or start a session
  async startOrResume(sessionId: string = 'mission1_quest1') {
    const saved = await StorageService.loadSession(sessionId);
    
    if (saved) {
      this.currentState = saved;
      console.log('🔄 Resuming session:', saved);
      this.currentNodeIndex = saved.currentNodeIndex;
      this.currentFlow = this.getTaskFlow(saved.currentTaskId);
      await this.processCurrentNode();
    } else {
      this.currentState = {
        sessionId: sessionId,
        currentTaskId: 'task_1_1',
        currentNodeIndex: 0,
        taskData: {},
        completedTasks: [],
        updatedAt: new Date().toISOString()
      };
      this.currentFlow = task1_1_WhyStart;
      this.currentNodeIndex = 0;
      await this.saveState();
      await this.processCurrentNode();
    }
  }

  private getTaskFlow(taskId: string): TaskFlow {
    const flows: Record<string, TaskFlow> = {
      'task_1_1': task1_1_WhyStart,
    };
    return flows[taskId] || task1_1_WhyStart;
  }

  // FIXED: Added missing completeTask method
  private async completeTask() {
    if (!this.currentState) return;
    
    // Mark task as complete
    this.currentState.completedTasks.push(this.currentState.currentTaskId);
    await this.saveState();
    
    // Notify completion
    this.onStateChange?.('COMPLETE', 'Task complete!');
    console.log('✅ Task complete:', this.currentState.currentTaskId);
    
    // For now, we just stop. Later we'll move to next task.
  }

  // FIXED: Updated to call completeTask
  private async processCurrentNode() {
    if (!this.currentFlow || !this.currentState) return;

    const nodes = this.currentFlow.nodes;
    if (this.currentNodeIndex >= nodes.length) {
      await this.completeTask();
      return;
    }

    const node = nodes[this.currentNodeIndex];
    console.log(`📍 Processing node ${this.currentNodeIndex}: ${node.id} (${node.type})`);

    switch (node.type) {
      case 'SPEAK':
        await this.handleSpeak(node);
        break;
      case 'LISTEN':
        await this.handleListen(node);
        break;
      case 'PROCESS_RULE':
        await this.handleRule(node);
        break;
      case 'PROCESS_AI':
        await this.handleAI(node);
        break;
      case 'SAVE':
        await this.handleSave(node);
        break;
      case 'COMPLETE':
        await this.handleComplete(node);
        break;
      default:
        console.warn('Unknown node type:', node.type);
        this.currentNodeIndex++;
        this.processCurrentNode();
    }
  }

  // --- Node Handlers ---

  private async handleSpeak(node: ConversationNode) {
    let text = node.content || '';
    if (this.currentState?.taskData) {
      for (const [key, value] of Object.entries(this.currentState.taskData)) {
        text = text.replace(`{${key}}`, String(value));
      }
    }
    if (this.onSpeak) {
      this.onSpeak(text);
      this.currentNodeIndex++;
      await this.saveState();
      setTimeout(() => this.processCurrentNode(), 500);
    }
  }

  private async handleListen(node: ConversationNode) {
    if (this.onListen) {
      this.onStateChange?.('LISTENING', 'Listening...');
      const transcript = await this.onListen();
      
      if (node.field) {
        this.currentState!.taskData[node.field] = transcript;
        await StorageService.saveTranscript(
          this.currentState!.sessionId,
          node.id,
          transcript,
          node.field
        );
      }
      await this.saveState();
      this.currentNodeIndex++;
      this.processCurrentNode();
    }
  }

  private async handleRule(node: ConversationNode) {
    if (!this.currentState) return;
    const data = this.currentState.taskData;
    const result = node.rule ? node.rule(data) : true;
    
    let nextNodeId: string | undefined;
    if (typeof result === 'string') {
      nextNodeId = result;
    } else if (result === true) {
      nextNodeId = node.nextYes;
    } else {
      nextNodeId = node.nextNo;
    }

    if (nextNodeId) {
      const index = this.currentFlow!.nodes.findIndex(n => n.id === nextNodeId);
      if (index !== -1) {
        this.currentNodeIndex = index;
        await this.saveState();
        this.processCurrentNode();
        return;
      }
    }
    this.currentNodeIndex++;
    this.processCurrentNode();
  }

  private async handleAI(node: ConversationNode) {
    if (!this.currentState || !node.aiPrompt) return;
    this.onStateChange?.('PROCESSING', 'Thinking...');
    
    const field = node.field?.replace('_summary', '_raw') || 'why_raw';
    const transcript = this.currentState.taskData[field] || '';
    
    const prompt = node.aiPrompt.replace('{transcript}', transcript);
    const summary = await DeepSeekService.summarize(prompt, transcript);
    
    if (node.field) {
      this.currentState.taskData[node.field] = summary;
    }
    await this.saveState();
    
    this.currentNodeIndex++;
    this.processCurrentNode();
  }

  private async handleSave(node: ConversationNode) {
    await this.saveState();
    this.currentNodeIndex++;
    this.processCurrentNode();
  }

  private async handleComplete(node: ConversationNode) {
    await this.completeTask();
  }

  private async saveState() {
    if (!this.currentState) return;
    this.currentState.updatedAt = new Date().toISOString();
    this.currentState.currentNodeIndex = this.currentNodeIndex;
    await StorageService.saveSession(this.currentState);
  }

  onStateChangeListener(callback: (state: string, data?: any) => void) {
    this.onStateChange = callback;
  }
}
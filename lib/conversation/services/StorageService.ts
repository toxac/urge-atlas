import * as SQLite from 'expo-sqlite';
import { SessionState } from '../engine/types';

// Open the database
const db = SQLite.openDatabaseSync('atlas.db');

export const StorageService = {
  // Initialize tables
  async init() {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        session_id TEXT UNIQUE,
        current_task_id TEXT,
        current_node_index INTEGER,
        task_data TEXT,
        completed_tasks TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        node_id TEXT,
        transcript TEXT,
        field_name TEXT,
        created_at TEXT
      );
    `);
    console.log('📦 SQLite initialized');
  },

  // Save or update the current session state
  async saveSession(state: SessionState) {
    const { sessionId, currentTaskId, currentNodeIndex, taskData, completedTasks, updatedAt } = state;
    await db.runAsync(
      `INSERT OR REPLACE INTO sessions (id, session_id, current_task_id, current_node_index, task_data, completed_tasks, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      sessionId,
      currentTaskId,
      currentNodeIndex,
      JSON.stringify(taskData),
      JSON.stringify(completedTasks),
      updatedAt
    );
    console.log('💾 Session saved');
  },

  // Load the session state
  async loadSession(sessionId: string): Promise<SessionState | null> {
    const result = await db.getFirstAsync<{
      session_id: string;
      current_task_id: string;
      current_node_index: number;
      task_data: string;
      completed_tasks: string;
      updated_at: string;
    }>(
      `SELECT * FROM sessions WHERE session_id = ?`,
      sessionId
    );
    if (!result) return null;
    return {
      sessionId: result.session_id,
      currentTaskId: result.current_task_id,
      currentNodeIndex: result.current_node_index,
      taskData: JSON.parse(result.task_data),
      completedTasks: JSON.parse(result.completed_tasks),
      updatedAt: result.updated_at,
    };
  },

  // Append a transcript
  async saveTranscript(taskId: string, nodeId: string, transcript: string, fieldName: string) {
    await db.runAsync(
      `INSERT INTO transcripts (task_id, node_id, transcript, field_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      taskId,
      nodeId,
      transcript,
      fieldName,
      new Date().toISOString()
    );
    console.log('📝 Transcript saved');
  },
  async clearSession(sessionId: string) {
    await db.runAsync(
      `DELETE FROM sessions WHERE session_id = ?`,
      sessionId
    );
    console.log(`🗑️ Session ${sessionId} cleared`);
  },
};

// Add this method to StorageService

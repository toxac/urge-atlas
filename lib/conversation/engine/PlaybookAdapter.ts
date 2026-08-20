import { QuestSchema, TaskSchema } from '../../../types/playbook';
import mission1 from '../../playbook/mission1';

export class PlaybookAdapter {
  // Lock down scope exclusively to Quest 1
  private quest: QuestSchema = mission1.quests[0]; // "The New Beginning"

  getTask(taskIndex: number): {
    task: TaskSchema;
    quest: QuestSchema;
    taskIndex: number;
    totalTasks: number;
    isLastTask: boolean;
  } | null {
    const task = this.quest.tasks[taskIndex];
    if (!task) return null;

    return {
      task,
      quest: this.quest,
      taskIndex,
      totalTasks: this.quest.tasks.length,
      isLastTask: taskIndex === this.quest.tasks.length - 1,
    };
  }

  getQuestDetails() {
    return {
      questTitle: this.quest.title,
      badge: this.quest.badge_config,
      successMessage: this.quest.success_message,
      totalTasks: this.quest.tasks.length,
    };
  }
}

export const playbookAdapter = new PlaybookAdapter();
import { api } from './api';
import type { Quest } from '../types/quest.types';

export const questService = {
  getMyQuests: async (): Promise<Quest[]> => {
    const response = await api.get<Quest[]>('/quests');
    return response.data;
  },
  cancelQuest: async (questId: number): Promise<void> => {
    await api.post(`/quests/${questId}/cancel`);
  },
};

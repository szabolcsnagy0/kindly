import api from "./api";
import { Badge, LeaderboardEntry, AwardBadgeRequest } from "../types/badge.types";
import { ApiResponse } from "../types/api.types";

const badgeCache = new Map<number, Badge[]>();

export const badgeService = {
  clearCache(userId?: number) {
    if (userId) {
      badgeCache.delete(userId);
    } else {
      badgeCache.clear();
    }
  },

  async awardBadge(request: AwardBadgeRequest): Promise<Badge> {
    const response = await api.post<ApiResponse<Badge>>("/badges/award", request);
    this.clearCache(request.user_id);
    return response.data.data;
  },

  async getUserBadges(userId: number): Promise<Badge[]> {
    if (badgeCache.has(userId)) {
      return badgeCache.get(userId)!;
    }

    const response = await api.get<ApiResponse<Badge[]>>(`/badges/user/${userId}`);
    const badges = response.data.data;

    badgeCache.set(userId, badges);

    return badges;
  },

  async getMyBadges(): Promise<Badge[]> {
    const response = await api.get<ApiResponse<Badge[]>>("/badges/my-badges");
    return response.data.data;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await api.get<ApiResponse<LeaderboardEntry[]>>("/badges/leaderboard");
    return response.data.data;
  },

  async checkAchievements() {
    await api.post("/badges/check-achievements");
  },

  async getBadgeProgress(badgeId: number): Promise<{ badge_id: number; progress: number; completed: boolean }> {
    const response = await api.get<ApiResponse<any>>(`/badges/progress/${badgeId}`);
    return response.data.data;
  },

  getRarityColor(rarity: number): string {
    if (rarity === 1) return "#808080";
    if (rarity === 2) return "#4169E1";
    if (rarity === 3) return "#9B30FF";
    if (rarity === 4) return "#FFD700";
    return "#000000";
  },

  getRarityName(rarity: number) {
    const names = ["Common", "Rare", "Epic", "Legendary"];
    return names[rarity - 1];
  },

  async createSpecialBadge(
    userId: number,
    badgeName: string,
    description: string,
    rarity: number,
    apiKey: string
  ): Promise<Badge> {
    const response = await api.post<ApiResponse<Badge>>(
      "/badges/admin/special",
      { user_id: userId, badge_name: badgeName, description, rarity },
      { headers: { "X-API-Key": apiKey } }
    );
    return response.data.data;
  },

  async resetUserBadges(userId: number): Promise<void> {
    await api.delete(`/badges/reset/${userId}`);
    badgeCache.delete(userId);
  },
};

export interface Badge {
  id: number;
  badge_id: number;
  badge_name: string;
  rarity: number;
  description?: string;
  progress: number;
  is_completed: boolean;
}

export interface LeaderboardEntry {
  user_id: number;
  name: string;
  badge_count: number;
  legendary_count: number;
}

export interface AwardBadgeRequest {
  user_id: number;
  badge_id: number;
}

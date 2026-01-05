import { describe, it, expect, vi, beforeEach } from "vitest";
import { badgeService } from "../badge.service";
import api from "../api";

vi.mock("../api");

describe("badgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards badge and returns badge data", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          id: 1,
          badge_id: 2,
          badge_name: "Test",
          rarity: 1,
          progress: 100,
          is_completed: true,
        },
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const result = await badgeService.awardBadge({ user_id: 1, badge_id: 2 });

    expect(result).toEqual({
      id: 1,
      badge_id: 2,
      badge_name: "Test",
      rarity: 1,
      progress: 100,
      is_completed: true,
    });
    expect(api.post).toHaveBeenCalledWith("/badges/award", { user_id: 1, badge_id: 2 });
  });

  it("gets user badges and returns array", async () => {
    const mockBadges = [
      { id: 1, badge_id: 1, badge_name: "Badge1", rarity: 1, progress: 100, is_completed: true },
      { id: 2, badge_id: 2, badge_name: "Badge2", rarity: 2, progress: 100, is_completed: true },
    ];

    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: mockBadges },
    });

    const result = await badgeService.getUserBadges(1);

    expect(result).toHaveLength(2);
    expect(result[0].badge_name).toBe("Badge1");
    expect(result[1].rarity).toBe(2);
  });

  it("gets leaderboard with correct structure", async () => {
    const mockLeaderboard = [
      { user_id: 1, name: "User1", badge_count: 5, legendary_count: 1 },
      { user_id: 2, name: "User2", badge_count: 3, legendary_count: 0 },
    ];

    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: mockLeaderboard },
    });

    const result = await badgeService.getLeaderboard();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      user_id: 1,
      name: "User1",
      badge_count: 5,
      legendary_count: 1,
    });
  });

  it("checks achievements and calls API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    await badgeService.checkAchievements();

    expect(api.post).toHaveBeenCalledWith("/badges/check-achievements");
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("returns correct rarity colors", () => {
    expect(badgeService.getRarityColor(1)).toBe("#808080");
    expect(badgeService.getRarityColor(2)).toBe("#4169E1");
    expect(badgeService.getRarityColor(3)).toBe("#9B30FF");
    expect(badgeService.getRarityColor(4)).toBe("#FFD700");
    expect(badgeService.getRarityColor(999)).toBe("#000000");
  });

  it("returns correct rarity names", () => {
    expect(badgeService.getRarityName(1)).toBe("Common");
    expect(badgeService.getRarityName(2)).toBe("Rare");
    expect(badgeService.getRarityName(3)).toBe("Epic");
    expect(badgeService.getRarityName(4)).toBe("Legendary");
  });

  it("gets badge progress with correct data", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { badge_id: 1, progress: 50, completed: false } },
    });

    const result = await badgeService.getBadgeProgress(1);

    expect(result).toEqual({
      badge_id: 1,
      progress: 50,
      completed: false,
    });
    expect(api.get).toHaveBeenCalledWith("/badges/progress/1");
  });

  it("caches user badges", async () => {
    const mockBadges = [
      { id: 1, badge_id: 1, badge_name: "Badge1", rarity: 1, progress: 100, is_completed: true },
    ];

    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: mockBadges },
    });

    await badgeService.getUserBadges(1);
    await badgeService.getUserBadges(1);

    expect(api.get).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { badgeService } from "../badge.service";
import api from "../api";

vi.mock("../api");

describe("badgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards badge", async () => {
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

    expect(result).toBeDefined();
    expect(result.badge_id).toBe(2);
  });

  it("gets user badges", async () => {
    const mockBadges = [
      { id: 1, badge_id: 1, badge_name: "Badge1", rarity: 1, progress: 100, is_completed: true },
      { id: 2, badge_id: 2, badge_name: "Badge2", rarity: 2, progress: 100, is_completed: true },
    ];

    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: mockBadges },
    });

    const result = await badgeService.getUserBadges(1);

    expect(result.length).toBeGreaterThan(0);
  });

  it("gets leaderboard", async () => {
    const mockLeaderboard = [
      { user_id: 1, name: "User1", badge_count: 5, legendary_count: 1 },
    ];

    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: mockLeaderboard },
    });

    const result = await badgeService.getLeaderboard();

    expect(result).toEqual(expect.any(Array));
  });

  it("checks achievements", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    badgeService.checkAchievements();

    expect(api.post).toHaveBeenCalled();
  });

  it("returns rarity color", () => {
    const color1 = badgeService.getRarityColor(1);
    const color2 = badgeService.getRarityColor(2);

    expect(color1).toBe("#808080");
    expect(color2).not.toBe(color1);
  });

  it("returns rarity name", () => {
    const name = badgeService.getRarityName(1);
    expect(name).toBeTruthy();
  });

  it("handles badge progress", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { badge_id: 1, progress: 50, completed: false } },
    });

    const result = await badgeService.getBadgeProgress(1);

    expect(result.progress).toBeLessThanOrEqual(100);
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

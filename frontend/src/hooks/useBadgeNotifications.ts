import { useEffect, useState } from "react";
import { badgeService } from "../services/badge.service";
import { Badge } from "../types/badge.types";

const CHECK_INTERVAL = 30000;

export const useBadgeNotifications = () => {
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [seenBadgeIds, setSeenBadgeIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const checkForNewBadges = async () => {
      try {
        await badgeService.checkAchievements();
        const badges = await badgeService.getMyBadges();

        const completedBadges = badges.filter(b => b.is_completed);
        const unseenBadges = completedBadges.filter(
          b => !seenBadgeIds.has(b.id)
        );

        if (unseenBadges.length > 0) {
          setNewBadges(prev => [...prev, ...unseenBadges]);
          setSeenBadgeIds(prev => {
            const updated = new Set(prev);
            unseenBadges.forEach(b => updated.add(b.id));
            return updated;
          });
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
      }
    };

    checkForNewBadges();
    const interval = setInterval(checkForNewBadges, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [seenBadgeIds]);

  const dismissBadge = (badgeId: number) => {
    setNewBadges(prev => prev.filter(b => b.id !== badgeId));
  };

  return { newBadges, dismissBadge };
};

import { useEffect, useState, useMemo } from "react";
import { Box, Heading, SimpleGrid, Text, Button, Spinner, toaster } from "@chakra-ui/react";
import { badgeService } from "../services/badge.service";
import { Badge } from "../types/badge.types";
import { BadgeCard } from "../components/badges/BadgeCard";
import { useNavigate } from "react-router";

const RARITY_POINTS = {
  COMMON: 1,
  RARE: 5,
  EPIC: 15,
  LEGENDARY: 50,
} as const;

export const MyBadgesPage = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const myBadges = await badgeService.getMyBadges();
        setBadges(myBadges);
        setLoading(false);
      } catch (error) {
        toaster.create({
          title: "Failed to load badges",
          description: "Please try again later",
          type: "error",
        });
        setLoading(false);
      }
    };

    fetchBadges();
    badgeService.checkAchievements();
  }, []);

  const completedBadges = badges.filter((b) => b.is_completed);
  const inProgressBadges = badges.filter((b) => !b.is_completed);

  const rarityScore = useMemo(() => {
    return completedBadges.reduce((total, badge) => {
      if (badge.rarity === 1) return total + RARITY_POINTS.COMMON;
      if (badge.rarity === 2) return total + RARITY_POINTS.RARE;
      if (badge.rarity === 3) return total + RARITY_POINTS.EPIC;
      if (badge.rarity === 4) return total + RARITY_POINTS.LEGENDARY;
      return total;
    }, 0);
  }, [completedBadges]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>My Badges</Heading>
        <Button colorScheme="blue" onClick={() => navigate("/leaderboard")}>
          View Leaderboard
        </Button>
      </Box>

      <Box mb={6} p={4} bg="blue.50" borderRadius="md">
        <Text fontSize="lg">
          Total Badges: <strong>{completedBadges.length}</strong>
        </Text>
        <Text fontSize="lg">
          Rarity Score: <strong>{rarityScore}</strong>
        </Text>
      </Box>

      {completedBadges.length > 0 && (
        <>
          <Heading size="md" mb={4}>
            Completed Badges
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mb={8}>
            {completedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </SimpleGrid>
        </>
      )}

      {inProgressBadges.length > 0 && (
        <>
          <Heading size="md" mb={4}>
            In Progress
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {inProgressBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </SimpleGrid>
        </>
      )}

      {badges.length === 0 && (
        <Box textAlign="center" py={12}>
          <Text fontSize="xl" color="gray.500">
            No badges yet. Start completing requests to earn badges!
          </Text>
        </Box>
      )}
    </Box>
  );
};

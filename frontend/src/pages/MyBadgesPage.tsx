import { useEffect, useState } from "react";
import { Box, Heading, SimpleGrid, Text, Button, Spinner } from "@chakra-ui/react";
import { badgeService } from "../services/badge.service";
import { Badge } from "../types/badge.types";
import { BadgeCard } from "../components/badges/BadgeCard";
import { useNavigate } from "react-router";

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
        console.log("Error fetching badges:", error);
        setLoading(false);
      }
    };

    fetchBadges();
    badgeService.checkAchievements();
  }, []);

  const completedBadges = badges.filter((b) => b.is_completed);
  const inProgressBadges = badges.filter((b) => !b.is_completed);

  const calculateTotalRarity = () => {
    let total = 0;
    for (let i = 0; i < completedBadges.length; i++) {
      const badge = completedBadges[i];
      if (badge.rarity === 1) total += 1;
      else if (badge.rarity === 2) total += 5;
      else if (badge.rarity === 3) total += 15;
      else if (badge.rarity === 4) total += 50;
    }
    return total;
  };

  const rarityScore = calculateTotalRarity();

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

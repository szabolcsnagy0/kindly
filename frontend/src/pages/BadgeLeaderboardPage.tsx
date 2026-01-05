import { useEffect, useState } from "react";
import { Box, Heading, Text, Stack, Spinner } from "@chakra-ui/react";
import { badgeService } from "../services/badge.service";
import { LeaderboardEntry } from "../types/badge.types";

export const BadgeLeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await badgeService.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading mb={6}>Badge Leaderboard</Heading>

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      <Stack gap={3}>
        {leaderboard.map((entry, index) => {
          let rankColor;
          if (index === 0) rankColor = "#FFD700";
          else if (index === 1) rankColor = "#C0C0C0";
          else if (index === 2) rankColor = "#CD7F32";

          return (
            <Box
              key={entry.user_id}
              p={4}
              bg="white"
              borderRadius="md"
              borderWidth="1px"
              borderColor={rankColor ? rankColor : "gray.200"}
              borderLeftWidth={rankColor ? "4px" : "1px"}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box display="flex" alignItems="center" gap={3}>
                <Text fontSize="2xl" fontWeight="bold" color={rankColor}>
                  #{index + 1}
                </Text>
                <Box>
                  <Text fontWeight="semibold">{entry.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {entry.badge_count} total badges
                  </Text>
                </Box>
              </Box>

              <Box textAlign="right">
                {entry.legendary_count > 0 && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Text fontSize="2xl">🏆</Text>
                    <Text fontSize="lg" fontWeight="bold" color="#FFD700">
                      {entry.legendary_count}
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {leaderboard.length === 0 && !loading && (
        <Text color="gray.500">No badges earned yet!</Text>
      )}
    </Box>
  );
};

import { Badge as BadgeType } from "../../types/badge.types";
import { Box, Badge, Text, Stack } from "@chakra-ui/react";
import { badgeService } from "../../services/badge.service";

interface BadgeCardProps {
  badge: BadgeType;
  onClick?: () => void;
}

export const BadgeCard = ({ badge, onClick }: BadgeCardProps) => {
  const rarityColor = badgeService.getRarityColor(badge.rarity);
  const rarityName = badgeService.getRarityName(badge.rarity);

  const handleClick = () => {
    console.log("Badge clicked:", badge);
    if (onClick) {
      onClick();
    }
  };

  let progressBar;
  if (badge.progress < 100) {
    progressBar = (
      <Box bg="gray.200" h="4px" w="full" borderRadius="full" data-testid="progress-bar">
        <Box
          bg={rarityColor}
          h="full"
          w={`${badge.progress}%`}
          borderRadius="full"
        />
      </Box>
    );
  }

  return (
    <Box
      p={4}
      borderWidth="2px"
      borderColor={rarityColor}
      borderRadius="lg"
      cursor={onClick ? "pointer" : "default"}
      onClick={handleClick}
      bg={badge.is_completed ? "white" : "gray.50"}
      _hover={{ transform: "translateY(-2px)", shadow: "md" }}
      transition="all 0.2s"
    >
      <Stack gap={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="lg" fontWeight="bold" color={rarityColor}>
            {badge.badge_name}
          </Text>
          <Badge colorScheme={badge.rarity === 4 ? "yellow" : badge.rarity === 3 ? "purple" : "blue"}>
            {rarityName}
          </Badge>
        </Box>

        {badge.description && (
          <Text fontSize="sm" color="gray.600">
            {badge.description}
          </Text>
        )}

        {progressBar}

        {badge.is_completed && (
          <Text fontSize="xs" color="green.500" fontWeight="semibold">
            ✓ Completed
          </Text>
        )}
      </Stack>
    </Box>
  );
};

import { useEffect, useState } from "react";
import { Badge } from "../../types/badge.types";
import { Box, Text, Button } from "@chakra-ui/react";
import { badgeService } from "../../services/badge.service";

interface BadgeNotificationProps {
  badge: Badge;
  onClose: () => void;
}

let allNotifications: Badge[] = [];

export const BadgeNotification = ({ badge, onClose }: BadgeNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    allNotifications.push(badge);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const rarityColor = badgeService.getRarityColor(badge.rarity);

  return (
    <Box
      position="fixed"
      top="20px"
      right="20px"
      bg="white"
      p={6}
      borderRadius="lg"
      boxShadow="2xl"
      borderWidth="3px"
      borderColor={rarityColor}
      maxW="350px"
      zIndex={9999}
      animation="slideIn 0.3s ease-out"
    >
      <Text fontSize="xl" fontWeight="bold" color={rarityColor} mb={2}>
        🎉 New Badge Unlocked!
      </Text>
      <Text fontSize="lg" fontWeight="semibold" mb={1}>
        {badge.badge_name}
      </Text>
      {badge.description && (
        <Text fontSize="sm" color="gray.600" mb={3}>
          {badge.description}
        </Text>
      )}
      <Button
        size="sm"
        colorScheme="blue"
        onClick={() => {
          setIsVisible(false);
          onClose();
        }}
      >
        Awesome!
      </Button>
    </Box>
  );
};

export const getAllNotifications = () => allNotifications;

export const clearNotifications = () => {
  allNotifications = [];
};

import { type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Text,
  HStack,
  VStack,
  Button,
  Icon,
  Separator,
  Badge,
  SimpleGrid,
} from "@chakra-ui/react";
import { Avatar } from "@chakra-ui/react/avatar";
import {
  FaStar,
  FaEdit,
  FaCalendarAlt,
  FaEnvelope,
  FaInfoCircle,
  FaUserClock,
  FaTrophy,
  FaScroll,
} from "react-icons/fa";
import { VOLUNTEER_LEVELS, HELP_SEEKER_LEVELS } from "../../types/levels";
import type { User } from "../../types";
import { getFullName, pickAvatarPalette } from "../../utils/avatar";
import { formatDateCompact } from "../../utils/date";
import { QuestList } from "./QuestList";
import { getBadgeInfo } from "../../utils/badges";

interface ProfileDetailsProps {
  currentUserIsVolunteer: boolean;
  user: User;
  isOwnProfile: boolean;
}

export const ProfileDetails = ({
  currentUserIsVolunteer,
  user,
  isOwnProfile,
}: ProfileDetailsProps) => {
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/profile/${user.id}/edit`);
  };

  // Determine accent color based on user type
  const accentColor = currentUserIsVolunteer ? "teal.400" : "coral.500";

  const rating = Number(user.avg_rating);
  const showRating = Number.isFinite(rating) && rating > 0;

  const currentLevel = user.level;

  const progressPercent = Math.min(
    100,
    Math.round((user.experience / user.experience_to_next_level) * 100)
  );

  const levelMap = user.is_volunteer ? VOLUNTEER_LEVELS : HELP_SEEKER_LEVELS;

  const levelMeta = levelMap[currentLevel] || {
    name: `Level ${currentLevel}`,
    icon: FaStar,
    color: accentColor,
  };
  const nextLevelMeta = levelMap[currentLevel + 1] || {
    name: `Level ${currentLevel + 1}`,
  };

  const badges = user.badges
    ? user.badges.split(",").filter(Boolean).map((id) => getBadgeInfo(id))
    : [];

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      boxShadow="xl"
      p={8}
      w="full"
      maxW="900px"
      mx="auto"
      borderTop="4px solid"
      borderColor={accentColor}
      position="relative"
    >
      <Stack gap={6}>
        {isOwnProfile && (
          <Button
            onClick={handleEdit}
            bg={accentColor}
            color="white"
            size="md"
            borderRadius="full"
            px={5}
            position="absolute"
            top={6}
            right={6}
            _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
            _active={{ transform: "translateY(0)" }}
            transition="all 0.2s ease"
          >
            <Icon as={FaEdit as ElementType} mr={2} />
            Edit Profile
          </Button>
        )}
        {/* Header with profile picture, name, and rating */}
        <VStack gap={4} align="center">
          {/* Profile Picture */}
          <Avatar.Root
            size="2xl"
            colorPalette={pickAvatarPalette(user.first_name, user.last_name)}
          >
            <Avatar.Fallback
              name={getFullName(user.first_name, user.last_name)}
            />
          </Avatar.Root>

          {/* Name */}
          <Text fontSize="3xl" fontWeight="bold" color="gray.800">
            {getFullName(user.first_name, user.last_name)}
          </Text>

          {/* Role badge + optional star rating */}
          <HStack gap={3} align="center">
            <Badge
              px={4}
              fontSize="sm"
              fontWeight="semibold"
              borderRadius="999px"
              bg={user.is_volunteer ? "teal.50" : "coral.50"}
              color={user.is_volunteer ? "teal.600" : "coral.800"}
              h="34px"
              display="inline-flex"
              alignItems="center"
              lineHeight="1"
            >
              {user.is_volunteer ? "Volunteer" : "Help Seeker"}
            </Badge>
            {showRating && (
              <HStack
                gap={2}
                bg="gray.100"
                px={4}
                borderRadius="999px"
                h="34px"
                align="center"
              >
                <Icon as={FaStar as ElementType} boxSize={4} color="gray.700" />
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="gray.700"
                  lineHeight="1"
                >
                  {rating.toFixed(1)}
                </Text>
              </HStack>
            )}
          </HStack>

          {/* Level progress bar with icon and next level name */}
          <Box w="full" maxW="560px" mx="auto">
            <HStack align="center" justify="center" gap={4} mt={2}>
              <Box
                bg={`${levelMeta.color}.50`}
                color={levelMeta.color}
                borderRadius="full"
                p={3}
                boxShadow="md"
                minW="48px"
                minH="48px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={levelMeta.icon as ElementType} boxSize={6} />
              </Box>

              <VStack gap={1} align="stretch" flex={1}>
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <Text fontSize="md" fontWeight="semibold" color="gray.800">
                      {levelMeta.name}
                    </Text>
                    <Badge
                      bg={levelMeta.color}
                      color="white"
                      borderRadius="full"
                      px={2}
                      fontSize="xs"
                    >
                      Lvl {currentLevel}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Next: {nextLevelMeta.name}
                  </Text>
                </HStack>

                <Box>
                  <Box
                    bg="gray.100"
                    borderRadius="999px"
                    h="8px"
                    overflow="hidden"
                  >
                    <Box
                      bg={currentUserIsVolunteer ? "teal.400" : "coral.500"}
                      w={`${progressPercent}%`}
                      h="8px"
                      transition="width 0.25s ease"
                    />
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    {user.experience} / {user.experience_to_next_level} XP
                  </Text>
                </Box>
              </VStack>
            </HStack>
          </Box>
        </VStack>

        <Separator />

        {/* Profile Information */}
        <Stack gap={6}>
          {/* About Me */}
          <Box>
            <HStack gap={2} mb={3}>
              <Icon
                as={FaInfoCircle as ElementType}
                boxSize={5}
                color="gray.600"
              />
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                About Me
              </Text>
            </HStack>
            <Text fontSize="md" color="gray.600" lineHeight="1.7" pl={7}>
              {user.about_me || "No description provided"}
            </Text>
          </Box>

          {/* Email*/}

          <Box>
            <HStack gap={2} mb={3}>
              <Icon
                as={FaEnvelope as ElementType}
                boxSize={5}
                color="gray.600"
              />
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                Email Address
              </Text>
            </HStack>
            <Text fontSize="md" color="gray.600" pl={7}>
              {user.email}
            </Text>
          </Box>

          {/* Date of Birth */}
          <Box>
            <HStack gap={2} mb={3}>
              <Icon
                as={FaCalendarAlt as ElementType}
                boxSize={5}
                color="gray.600"
              />
              <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                Date of Birth
              </Text>
            </HStack>
            <Text fontSize="md" color="gray.600" pl={7}>
              {formatDateCompact(user.date_of_birth)}
            </Text>
          </Box>

          {/* Member Since */}
          {user.created_at && (
            <Box>
              <HStack gap={2} mb={3}>
                <Icon
                  as={FaUserClock as ElementType}
                  boxSize={5}
                  color="gray.600"
                />
                <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                  Member Since
                </Text>
              </HStack>
              <Text fontSize="md" color="gray.600" pl={7}>
                {formatDateCompact(user.created_at)}
              </Text>
            </Box>
          )}
        </Stack>

        {/* Badges Section */}
        {badges.length > 0 && (
          <>
            <Separator />
            <Box>
              <HStack gap={2} mb={3}>
                <Icon
                  as={FaTrophy as ElementType}
                  boxSize={5}
                  color="gray.600"
                />
                <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                  Badges
                </Text>
              </HStack>
              <SimpleGrid columns={[1, 2, 3]} gap={4}>
                {badges.map((badge) => {
                  const rarityColor = {
                    common: "gray",
                    rare: "purple",
                    legendary: "orange",
                  }[badge.type] || "gray";

                  return (
                    <HStack
                      key={badge.id}
                      p={3}
                      bg="white"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor={`${rarityColor}.200`}
                      gap={3}
                      alignItems="flex-start"
                    >
                      <Box
                        bg={`${badge.color.split(".")[0]}.100`}
                        color={badge.color}
                        p={2}
                        borderRadius="full"
                        mt={1}
                      >
                        <Icon as={badge.icon as ElementType} boxSize={5} />
                      </Box>
                      <VStack align="start" gap={1} flex={1}>
                        <HStack justify="space-between" width="full">
                          <Text fontWeight="bold" fontSize="sm" color="gray.800">
                            {badge.name}
                          </Text>
                          <Badge
                            bg={`${rarityColor}.100`}
                            color={`${rarityColor}.700`}
                            fontSize="0.6rem"
                            px={2}
                            borderRadius="full"
                            textTransform="uppercase"
                          >
                            {badge.type}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.500" lineHeight="1.2">
                          {badge.description}
                        </Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </SimpleGrid>
            </Box>
          </>
        )}

        {/* Quests Section */}
        {isOwnProfile && user.is_volunteer && (
          <>
            <Separator />
            <Box>
              <HStack gap={2} mb={3}>
                <Icon
                  as={FaScroll as ElementType}
                  boxSize={5}
                  color="gray.600"
                />
                <Text fontSize="lg" fontWeight="semibold" color="gray.700">
                  My Quests
                </Text>
              </HStack>
              <QuestList />
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
};

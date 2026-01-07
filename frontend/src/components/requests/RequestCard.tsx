import { Box, HStack, Stack, Text, Badge, Icon } from "@chakra-ui/react";
import {
  FaUsers,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelopeOpenText,
  FaUserCheck,
  FaTimesCircle,
} from "react-icons/fa";
import {
  type Request,
  type VolunteerRequest,
  ApplicationStatus,
  RequestStatus,
} from "../../types";
import type { ElementType } from "react";
import { formatDate, isPastDate } from "../../utils/date";

interface RequestCardProps {
  request: Request;
  isVolunteer: boolean;
  onClick?: () => void;
}

export const RequestCard = ({
  request,
  isVolunteer,
  onClick,
}: RequestCardProps) => {
  const getStatusInfo = () => {
    if (request.status === RequestStatus.COMPLETED) {
      return { label: "Completed", colorScheme: "gray", icon: FaCheckCircle };
    }

    if (isVolunteer) {
      const { application_status, status } = request as VolunteerRequest;

      if (application_status === ApplicationStatus.ACCEPTED) {
        return {
          label: "Accepted",
          colorScheme: "success",
          icon: FaUserCheck,
        };
      }

      if (application_status === ApplicationStatus.PENDING) {
        return {
          label: "Applied",
          colorScheme: "teal",
          icon: FaEnvelopeOpenText,
        };
      }

      if (application_status === ApplicationStatus.DECLINED) {
        return {
          label: "Declined",
          colorScheme: "red",
          icon: FaTimesCircle,
        };
      }

      if (
        application_status === ApplicationStatus.NOT_APPLIED &&
        status === RequestStatus.CLOSED
      ) {
        return {
          label: "Closed",
          colorScheme: "gray",
          icon: FaTimesCircle,
        };
      }
    } else if (request.status === RequestStatus.CLOSED) {
      return {
        label: "Volunteer Accepted",
        colorScheme: "success",
        icon: FaUserCheck,
      };
    }

    return { label: "Open", colorScheme: "coral", icon: FaClock };
  };

  const statusInfo = getStatusInfo();

  // Truncate description
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="md"
      p={5}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "lg",
      }}
      onClick={onClick}
      borderLeft="4px solid"
      borderLeftColor={`${statusInfo.colorScheme}.400`}
      display="flex"
      flexDirection="column"
    >
      <Stack gap={3} flex="1">
        {/* Header with title and status */}
        <HStack justify="space-between" align="start">
          <Text fontSize="lg" fontWeight="bold" color="gray.800" flex={1}>
            {request.name}
          </Text>
          <Badge
            px={2}
            py={1}
            borderRadius="full"
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Icon as={statusInfo.icon as ElementType} boxSize={3} />
            {statusInfo.label}
          </Badge>
        </HStack>

        {/* Description */}
        <Text fontSize="sm" color="gray.600" lineHeight="1.5" flex="1">
          {truncateText(request.description, 150)}
        </Text>

        {/* Request types */}
        {request.request_types &&
          request.request_types.length > 0 &&
          (() => {
            const maxVisible = 3;
            const visible = request.request_types.slice(0, maxVisible);
            const hasMore = request.request_types.length > maxVisible;
            return (
              <HStack gap={2} flexWrap="wrap">
                {visible.map((type) => (
                  <Badge
                    key={type.id}
                    colorScheme="purple"
                    variant="subtle"
                    fontSize="xs"
                    py={1}
                    px={2}
                  >
                    {type.name}
                  </Badge>
                ))}
                {hasMore && (
                  <Badge
                    colorScheme="gray"
                    variant="subtle"
                    fontSize="xs"
                    py={1}
                    px={2}
                  >
                    ...
                  </Badge>
                )}
              </HStack>
            );
          })()}

        {/* Footer info */}
        <HStack
          justify="space-between"
          pt={2}
          borderTop="1px solid"
          borderColor="gray.100"
        >
          {/* Start date */}
          <HStack gap={1} color="gray.500" fontSize="sm">
            <Icon as={FaCalendarAlt as ElementType} boxSize={3} />
            <Text
              color={isPastDate(request.start) ? "gray.400" : "gray.500"}
            >
              {formatDate(request.start, { format: "short" })}
            </Text>
          </HStack>

          {/* Reward (for volunteers) or Application count (for help seekers) */}
          {isVolunteer ? (
            <HStack gap={3}>
              {request.reward > 0 && (
                <HStack gap={1} color="green.600" fontSize="sm">
                  <Text fontWeight="semibold">${request.reward}</Text>
                </HStack>
              )}
              <HStack gap={1} color="gray.500" fontSize="sm">
                <Icon as={FaUsers as ElementType} boxSize={3} />
                <Text>{request.application_count ?? 0}</Text>
              </HStack>
            </HStack>
          ) : (
            <HStack gap={1} color="gray.500" fontSize="sm">
              <Icon as={FaUsers as ElementType} boxSize={3} />
              <Text>
                {request.application_count > 0
                  ? request.application_count
                  : "No applicants"}
              </Text>
            </HStack>
          )}
        </HStack>
      </Stack>
    </Box>
  );
};

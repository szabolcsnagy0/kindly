import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  Spinner,
} from '@chakra-ui/react';
import type { Quest } from '../../types/quest.types';
import { questService } from '../../services/quest.service';
// date util is not required here because we format inline without the year

export const QuestList = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchQuests = async () => {
    try {
      const data = await questService.getMyQuests();
      setQuests(data);
    } catch (error) {
      console.error('Failed to fetch quests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await questService.cancelQuest(id);
      fetchQuests();
    } catch (error) {
      console.error('Failed to cancel quest', error);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" py={8}>
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  if (quests.length === 0) {
    return null;
  }

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        {quests.map((quest) => {
          const progress = Math.min((quest.current_count / quest.target_count) * 100, 100);
          const formatDateNoYear = (dateInput: string | Date) => {
            const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            if (Number.isNaN(d.getTime())) return 'Invalid date';
            const month = d.toLocaleString(undefined, { month: 'short' });
            const day = d.getDate();
            const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `${day} ${month}, ${time}`;
          };

          return (
            <Box 
              key={quest.id} 
              p={4} 
              borderWidth="1px" 
              borderColor="gray.200"
              borderRadius="lg" 
              bg="white"
              shadow="sm"
            >
              <Heading size="sm" mb={2}>{quest.request_type_name}</Heading>
              <Box mt={2}>
                <Flex justify="space-between" fontSize="sm" color="gray.500" mb={1}>
                  <Text>Progress</Text>
                  <Text>{quest.current_count} / {quest.target_count}</Text>
                </Flex>
                <Box w="full" bg="gray.200" borderRadius="full" h="2.5">
                  <Box 
                    bg="blue.500" 
                    h="2.5" 
                    borderRadius="full" 
                    w={`${progress}%`}
                    transition="width 0.5s"
                  />
                </Box>
              </Box>
              <Flex mt={2} align="center">
                <Text fontSize="sm" color="gray.500" mr={2}>
                  Deadline:
                </Text>
                <Text as="span" fontSize="sm" color="gray.500" whiteSpace="nowrap">
                  {formatDateNoYear(quest.deadline)}
                </Text>
              </Flex>
              <Button 
                mt={3}
                size="sm"
                variant="outline"
                colorScheme="red"
                onClick={() => handleCancel(quest.id)}
                width="full"
              >
                Cancel Quest
              </Button>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

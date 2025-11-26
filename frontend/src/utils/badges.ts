import type { IconType } from "react-icons";
import {
  FaStar,
  FaTrophy,
  FaMedal,
  FaCheckCircle,
  FaShoppingBasket,
  FaDog,
  FaBroom,
  FaLeaf,
  FaGraduationCap,
  FaPaw,
  FaTools,
} from "react-icons/fa";

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  type: "common" | "rare" | "legendary";
  icon: IconType;
  color: string;
}

export const BADGE_DEFINITIONS: Record<string, BadgeInfo> = {
  "1": {
    id: "1",
    name: "Making Progress!",
    description: "Reached Level 2",
    type: "common",
    icon: FaTrophy,
    color: "blue.500",
  },
  "2": {
    id: "2",
    name: "Super Star",
    description: "Received a 5-star rating",
    type: "legendary",
    icon: FaStar,
    color: "yellow.400",
  },
  "101": {
    id: "101",
    name: "Super Shopper",
    description: "Completed a Shopping request",
    type: "common",
    icon: FaShoppingBasket,
    color: "purple.500",
  },
  "102": {
    id: "102",
    name: "Dog Whisperer",
    description: "Completed a Dog Walking request",
    type: "common",
    icon: FaDog,
    color: "orange.500",
  },
  "103": {
    id: "103",
    name: "Clean Freak",
    description: "Completed a Cleaning request",
    type: "common",
    icon: FaBroom,
    color: "cyan.500",
  },
  "104": {
    id: "104",
    name: "Green Thumb",
    description: "Completed a Gardening request",
    type: "common",
    icon: FaLeaf,
    color: "green.500",
  },
  "105": {
    id: "105",
    name: "Knowledge Sharer",
    description: "Completed a Tutoring request",
    type: "common",
    icon: FaGraduationCap,
    color: "blue.500",
  },
  "106": {
    id: "106",
    name: "Pet Pal",
    description: "Completed a Pet Sitting request",
    type: "common",
    icon: FaPaw,
    color: "pink.500",
  },
  "107": {
    id: "107",
    name: "Fix-It Pro",
    description: "Completed a Home Repair request",
    type: "common",
    icon: FaTools,
    color: "red.500",
  },
};

export const getBadgeInfo = (badgeId: string): BadgeInfo => {
  if (BADGE_DEFINITIONS[badgeId]) {
    return BADGE_DEFINITIONS[badgeId];
  }

  const idNum = Number.parseInt(badgeId, 10);
  if (idNum > 100) {
    // Request Type Badge
    // We might not know the name without the request type list, 
    // but we can return a generic one or try to infer.
    // Ideally we would look up the request type name.
    return {
      id: badgeId,
      name: "Helping Hand",
      description: "Completed a request of a specific type",
      type: "common",
      icon: FaCheckCircle,
      color: "green.500",
    };
  }

  return {
    id: badgeId,
    name: "Unknown Badge",
    description: "Mystery Achievement",
    type: "common",
    icon: FaMedal,
    color: "gray.500",
  };
};

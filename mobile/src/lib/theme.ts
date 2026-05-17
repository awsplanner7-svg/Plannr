export type BoardType =
  | "BACHELOR"
  | "MOVING"
  | "ENGAGEMENT"
  | "WEDDING"
  | "HOUSEWARMING"
  | "GROUP_TRIP"
  | "BABY_SHOWER"
  | "BIRTHDAY";

export type SuggestionStatus = "pending" | "approved" | "declined";
export type SuggestionType = "product" | "experience";

export const BOARD_TYPE_CONFIG: Record<
  BoardType,
  { bg: string; text: string; label: string; emoji: string }
> = {
  BACHELOR: { bg: "#FAEEDA", text: "#854F0B", label: "Bachelor / Bachelorette", emoji: "🥂" },
  MOVING: { bg: "#EAF3DE", text: "#3B6D11", label: "Moving / New Home", emoji: "📦" },
  ENGAGEMENT: { bg: "#FBEAF0", text: "#993556", label: "Engagement Party", emoji: "💍" },
  WEDDING: { bg: "#EEEDFE", text: "#534AB7", label: "Wedding", emoji: "💒" },
  HOUSEWARMING: { bg: "#EAF3DE", text: "#3B6D11", label: "Housewarming", emoji: "🏡" },
  GROUP_TRIP: { bg: "#E6F1FB", text: "#185FA5", label: "Group Trip", emoji: "✈️" },
  BABY_SHOWER: { bg: "#FAECE7", text: "#993C1D", label: "Baby Shower", emoji: "🍼" },
  BIRTHDAY: { bg: "#EEEDFE", text: "#534AB7", label: "Birthday", emoji: "🎂" },
};

export const BOARD_FILTER_TABS: Record<BoardType, string[]> = {
  BACHELOR: ["All", "Experiences", "Stays", "Dining"],
  MOVING: ["All", "Furniture", "Kitchen", "Decor"],
  ENGAGEMENT: ["All", "Venues", "Flowers", "Gifts"],
  WEDDING: ["All", "Venues", "Flowers", "Gifts"],
  HOUSEWARMING: ["All", "Furniture", "Kitchen", "Decor"],
  GROUP_TRIP: ["All", "Hotels", "Activities", "Restaurants"],
  BABY_SHOWER: ["All", "Gear", "Clothes", "Toys"],
  BIRTHDAY: ["All", "Experiences", "Venues", "Stays"],
};

export const BOARD_TYPES: BoardType[] = [
  "BACHELOR",
  "MOVING",
  "ENGAGEMENT",
  "WEDDING",
  "HOUSEWARMING",
  "GROUP_TRIP",
  "BABY_SHOWER",
  "BIRTHDAY",
];

export const AFFILIATE_SOURCES: Record<BoardType, string[]> = {
  MOVING:       ["Wayfair", "Amazon", "Living Spaces"],
  HOUSEWARMING: ["Wayfair", "Amazon", "Crate & Barrel"],
  BACHELOR:     ["Viator", "Airbnb", "OpenTable"],
  BIRTHDAY:     ["Viator", "OpenTable", "Airbnb"],
  GROUP_TRIP:   ["Booking.com", "Viator", "Rentalcars.com"],
  ENGAGEMENT:   ["Zola", "Amazon", "1-800-Flowers"],
  WEDDING:      ["Zola", "Viator", "Wayfair"],
  BABY_SHOWER:  ["Amazon Baby", "Buy Buy Baby", "Pottery Barn Kids"],
};

export const CURATED_CHIPS: Record<BoardType, string[]> = {
  MOVING:       ["Trending now", "Under $200", "Wayfair picks", "Amazon finds"],
  HOUSEWARMING: ["Trending now", "Under $200", "Wayfair picks", "Amazon finds"],
  BACHELOR:     ["Most popular", "Under $50/pp", "Viator picks", "Group deals"],
  BIRTHDAY:     ["Most popular", "Under $50/pp", "Viator picks", "Group deals"],
  GROUP_TRIP:   ["Trending now", "Under $100/pp", "Booking deals", "Viator picks"],
  ENGAGEMENT:   ["Most loved", "Under $100", "Zola picks", "Flower deals"],
  WEDDING:      ["Most loved", "Zola picks", "Viator honeymoon", "Under $500"],
  BABY_SHOWER:  ["Trending now", "Under $50", "Registry picks", "Amazon finds"],
};

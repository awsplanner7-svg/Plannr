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
export type ChecklistItemStatus = "todo" | "in_progress" | "done";

export interface BoardMemberInfo {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SuggestionAuthor {
  id: string;
  name: string;
  email: string;
}

export interface SuggestionWithVotes {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  imageUrl: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  author: SuggestionAuthor;
  voteCount: number;
  userVoted: boolean;
  createdAt: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  type: BoardType;
  creatorId: string;
  eventDate: string | null;
  suggestionCount: number;
  memberCount: number;
  members: Array<{ userId: string; name: string }>;
  inviteCode: string;
  createdAt: string;
}

export interface BoardDetail {
  id: string;
  name: string;
  type: BoardType;
  creatorId: string;
  eventDate: string | null;
  inviteCode: string;
  members: BoardMemberInfo[];
  suggestions: SuggestionWithVotes[];
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  actorId: string;
  actorName: string;
  action: 'suggested' | 'approved' | 'declined';
  itemTitle: string;
  boardId: string;
  boardName: string;
  boardType: string;
  createdAt: string;
}

export interface InboxPendingSuggestion {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
}

export interface InboxPendingGroup {
  boardId: string;
  boardName: string;
  boardType: string;
  suggestions: InboxPendingSuggestion[];
}

export interface InboxData {
  pending: InboxPendingGroup[];
  unreadCount: number;
}

export interface ChecklistItemDTO {
  id: string;
  boardId: string;
  title: string;
  link: string | null;
  description: string | null;
  category: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  status: ChecklistItemStatus;
  completed: boolean;
  suggestionId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type ItineraryCategory = 'food' | 'activity' | 'travel' | 'stay' | 'other';

export interface ItineraryItemDTO {
  id: string;
  dayId: string;
  boardId: string;
  time: string | null;
  title: string;
  description: string | null;
  link: string | null;
  location: string | null;
  category: ItineraryCategory;
  order: number;
  suggestionId: string | null;
  lastEditedBy: { id: string; name: string } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDayDTO {
  id: string;
  boardId: string;
  date: string | null;
  label: string | null;
  dayNumber: number;
  items: ItineraryItemDTO[];
  createdAt: string;
  updatedAt: string;
}

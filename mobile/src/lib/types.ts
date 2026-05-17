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
  type: "product" | "experience";
  status: "pending" | "approved" | "declined";
  author: SuggestionAuthor;
  voteCount: number;
  userVoted: boolean;
  createdAt: string;
}

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

export interface BoardSummary {
  id: string;
  name: string;
  type: string;
  creatorId: string;
  eventDate: string | null;
  suggestionCount: number;
  memberCount: number;
  members: Array<{ userId: string; name: string }>;
  createdAt: string;
  inviteCode?: string;
}

export interface BoardDetail {
  id: string;
  name: string;
  type: string;
  creatorId: string;
  eventDate: string | null;
  members: BoardMemberInfo[];
  suggestions: SuggestionWithVotes[];
  createdAt: string;
  inviteCode?: string;
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

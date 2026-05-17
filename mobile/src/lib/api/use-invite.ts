import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "./api";

export interface InviteBoardInfo {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  inviteCode: string;
  creatorName: string;
}

export interface JoinBoardResult {
  boardId: string;
  alreadyMember: boolean;
}

export interface SendEmailInviteResult {
  sent: boolean;
  inviteCode: string;
}

export interface SendEmailInvitesResult {
  sent: boolean;
  count: number;
  inviteCode: string;
}

export function useInviteInfo(code: string) {
  return useQuery({
    queryKey: ["invite", code],
    queryFn: () => api.get<InviteBoardInfo>(`/api/invite/${code}`),
    enabled: !!code,
  });
}

export function useJoinBoard() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<JoinBoardResult>(`/api/invite/${code}/join`, {}),
  });
}

export function useSendEmailInvite() {
  return useMutation({
    mutationFn: ({ boardId, email }: { boardId: string; email: string }) =>
      api.post<SendEmailInviteResult>(`/api/boards/${boardId}/invite-email`, { email }),
  });
}

export function useSendEmailInvites() {
  return useMutation({
    mutationFn: ({ boardId, emails }: { boardId: string; emails: string[] }) =>
      api.post<SendEmailInvitesResult>(`/api/boards/${boardId}/invite-emails`, { emails }),
  });
}

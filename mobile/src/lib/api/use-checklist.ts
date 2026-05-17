import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface ChecklistItem {
  id: string;
  boardId: string;
  title: string;
  link: string | null;
  description: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  status: 'todo' | 'in_progress' | 'done';
  completed: boolean;
  category: string;
  suggestionId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export function useChecklist(boardId: string) {
  return useQuery({
    queryKey: ['checklist', boardId],
    queryFn: () => api.get<ChecklistItem[]>(`/api/boards/${boardId}/checklist`),
    enabled: !!boardId,
  });
}

export function useCreateChecklistItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; link?: string; description?: string; assigneeId?: string; suggestionId?: string; category?: string }) =>
      api.post<ChecklistItem>(`/api/boards/${boardId}/checklist`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', boardId] }),
  });
}

export function useUpdateChecklistItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; link?: string | null; description?: string | null; assigneeId?: string | null; status?: string; completed?: boolean; category?: string }) =>
      api.patch<ChecklistItem>(`/api/checklist/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', boardId] }),
  });
}

export function useDeleteChecklistItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/checklist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', boardId] }),
  });
}

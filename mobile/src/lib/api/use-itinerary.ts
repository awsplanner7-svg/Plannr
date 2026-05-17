import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type ItineraryCategory = 'food' | 'activity' | 'travel' | 'stay' | 'other';

export interface ItineraryItem {
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

export interface ItineraryDay {
  id: string;
  boardId: string;
  date: string | null;
  label: string | null;
  dayNumber: number;
  items: ItineraryItem[];
  createdAt: string;
  updatedAt: string;
}

export function useItinerary(boardId: string) {
  return useQuery({
    queryKey: ['itinerary', boardId],
    queryFn: () => api.get<ItineraryDay[]>(`/api/boards/${boardId}/itinerary`),
    enabled: !!boardId,
  });
}

export function useCreateDay(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { dayNumber: number; date?: string }) =>
      api.post<ItineraryDay>(`/api/boards/${boardId}/itinerary/days`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useDeleteDay(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => api.delete(`/api/itinerary/days/${dayId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useUpdateDay(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, ...body }: { dayId: string; label?: string | null; date?: string | null }) =>
      api.patch<ItineraryDay>(`/api/itinerary/days/${dayId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useCreateItineraryItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, ...body }: { dayId: string; title: string; time?: string; description?: string; link?: string; location?: string; category?: string; suggestionId?: string }) =>
      api.post<ItineraryItem>(`/api/itinerary/days/${dayId}/items`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useUpdateItineraryItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; time?: string; description?: string; link?: string; location?: string; category?: string; order?: number }) =>
      api.patch<ItineraryItem>(`/api/itinerary/items/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useDeleteItineraryItem(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/itinerary/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

export function useReorderItems(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, itemIds }: { dayId: string; itemIds: string[] }) =>
      api.post<{ ok: boolean }>(`/api/itinerary/days/${dayId}/reorder`, { itemIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['itinerary', boardId] }),
  });
}

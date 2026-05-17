import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Plus } from "lucide-react-native";
import { api } from "@/lib/api/api";
import { BOARD_TYPE_CONFIG, BoardType } from "@/lib/theme";
import type { BoardSummary, ActivityItem } from "@/lib/types";
import { useSession } from "@/lib/auth/use-session";

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "#FAEEDA", text: "#854F0B" },
  { bg: "#EAF3DE", text: "#3B6D11" },
  { bg: "#FBEAF0", text: "#993556" },
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#EEEDFE", text: "#534AB7" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function getUpcomingBoard(boards: BoardSummary[]): BoardSummary | null {
  const now = Date.now();
  const upcoming = boards
    .filter((b) => b.eventDate && new Date(b.eventDate).getTime() > now)
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());
  return upcoming[0] ?? null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ComingUpCard({ board }: { board: BoardSummary }) {
  const config =
    BOARD_TYPE_CONFIG[board.type as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;

  return (
    <Pressable
      style={styles.comingUpCard}
      onPress={() => router.push(`/board/${board.id}` as any)}
      testID="coming-up-card"
    >
      <View
        style={[styles.comingUpAccentCircle, { backgroundColor: config.bg }]}
      />
      <View
        style={[styles.comingUpAccentTear, { backgroundColor: config.bg }]}
      />

      <Text style={styles.comingUpLabel}>COMING UP NEXT</Text>
      <Text style={styles.comingUpBoardName} numberOfLines={2}>
        {board.name}
      </Text>

      <View style={styles.comingUpBottom}>
        <Text style={styles.comingUpMembers}>
          {board.memberCount} {board.memberCount === 1 ? "member" : "members"}
        </Text>
        {board.suggestionCount > 0 ? (
          <View style={[styles.newPill, { backgroundColor: config.bg }]}>
            <Text style={[styles.newPillText, { color: config.text }]}>
              {board.suggestionCount} new
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function BoardCard({
  board,
  session,
  onLongPressDelete,
}: {
  board: BoardSummary;
  session?: ReturnType<typeof useSession>["data"];
  onLongPressDelete?: () => void;
}) {
  const config =
    BOARD_TYPE_CONFIG[board.type as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;

  const dateLabel = board.eventDate
    ? new Date(board.eventDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Ongoing";

  return (
    <Pressable
      style={({ pressed }) => [styles.boardCard, pressed && { opacity: 0.93 }]}
      onPress={() => router.push(`/board/${board.id}` as any)}
      onLongPress={onLongPressDelete}
      delayLongPress={400}
      testID="board-card"
    >
      <View
        style={[styles.tearCircle, { backgroundColor: config.bg }]}
        pointerEvents="none"
      />
      <View
        style={[styles.tearRect, { backgroundColor: config.bg }]}
        pointerEvents="none"
      />

      {board.suggestionCount > 0 ? (
        <View style={styles.unreadBadge} testID="unread-badge">
          <Text style={styles.unreadBadgeText}>{board.suggestionCount}</Text>
        </View>
      ) : null}

      <View style={styles.boardCardInner}>
        <View style={[styles.typePill, { backgroundColor: config.bg }]}>
          <Text style={[styles.typePillText, { color: config.text }]}>
            {config.emoji} {config.label}
          </Text>
        </View>

        <Text style={styles.boardName} numberOfLines={2}>
          {board.name}
        </Text>

        <View style={styles.boardCardBottom}>
          <View style={styles.memberStackRow}>
            <View style={styles.memberStack}>
              {board.members.slice(0, 3).map((member, idx) => {
                const colors = getAvatarColor(member.name);
                return (
                  <View
                    key={member.userId}
                    style={[
                      styles.memberStackAvatar,
                      {
                        backgroundColor: colors.bg,
                        marginLeft: idx === 0 ? 0 : -8,
                        zIndex: 3 - idx,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.memberStackInitial, { color: colors.text }]}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.memberCount}>
              {board.memberCount}{" "}
              {board.memberCount === 1 ? "member" : "members"}
            </Text>
          </View>

          <Text style={styles.boardDate}>{dateLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CreateBoardCard() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.createCard,
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => router.push("/create-board" as any)}
      testID="create-board-card"
    >
      <View style={styles.createCardInner}>
        <View style={styles.createIconWrap}>
          <Plus size={20} color="#AAAAAA" strokeWidth={1.8} />
        </View>
        <View>
          <Text style={styles.createCardTitle}>Create a new board</Text>
          <Text style={styles.createCardSubtitle}>{"Bachelor, wedding, moving & more"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const colors = getAvatarColor(item.actorName);
  const actionText =
    item.action === "suggested"
      ? "suggested"
      : item.action === "approved"
      ? "approved"
      : "declined";

  return (
    <View style={styles.activityItem} testID={`activity-item-${item.id}`}>
      <View style={[styles.activityAvatar, { backgroundColor: colors.bg }]}>
        <Text style={[styles.activityAvatarText, { color: colors.text }]}>
          {item.actorName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={2}>
          <Text style={styles.activityName}>{item.actorName}</Text>
          <Text style={styles.activityAction}> {actionText} </Text>
          <Text style={styles.activityBoard}>"{item.itemTitle}"</Text>
          {item.boardName ? (
            <Text style={styles.activityAction}> on {item.boardName}</Text>
          ) : null}
        </Text>
        <Text style={styles.activityTime}>{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BoardsScreen() {
  const { data: session } = useSession();
  const [boardToDelete, setBoardToDelete] = useState<BoardSummary | null>(null);
  const queryClient = useQueryClient();

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const userInitials = session?.user?.name
    ? getInitials(session.user.name)
    : "?";
  const userColors = session?.user?.name
    ? getAvatarColor(session.user.name)
    : { bg: "#EEEDFE", text: "#534AB7" };

  const {
    data: boards = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["boards"],
    queryFn: () => api.get<BoardSummary[]>("/api/boards"),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.get<ActivityItem[]>("/api/activity"),
  });

  const deleteBoard = useMutation({
    mutationFn: (boardId: string) => api.delete(`/api/boards/${boardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setBoardToDelete(null);
    },
  });

  const upcomingBoard = getUpcomingBoard(boards);
  const recentActivity = activity.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} testID="boards-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#1a1a1a"
          />
        }
        testID="boards-scroll-view"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={styles.greetingHey}>Hey, </Text>
            <Text style={styles.greetingName}>{firstName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              style={styles.newBoardBtn}
              onPress={() => router.push("/create-board" as any)}
              testID="new-board-header-btn"
            >
              <Text style={styles.newBoardBtnText}>+ New Board</Text>
            </Pressable>
            <View
              style={[styles.userAvatar, { backgroundColor: userColors.bg }]}
              testID="user-avatar"
            >
              <Text style={[styles.userAvatarText, { color: userColors.text }]}>
                {userInitials}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Coming Up Next (only if a board has a future date) ── */}
        {upcomingBoard ? (
          <View style={styles.section}>
            <ComingUpCard board={upcomingBoard} />
          </View>
        ) : null}

        {/* ── Your Boards ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your boards</Text>
        </View>

        <View style={styles.boardsList}>
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              session={session}
              onLongPressDelete={
                board.creatorId === session?.user?.id
                  ? () => setBoardToDelete(board)
                  : undefined
              }
            />
          ))}
          {!isLoading && boards.length === 0 ? (
            <View style={styles.emptyBoards} testID="boards-empty">
              <Text style={styles.emptyBoardsTitle}>No boards yet</Text>
              <Text style={styles.emptyBoardsSubtext}>
                Create your first board to get started
              </Text>
              <Pressable
                style={styles.emptyBoardsBtn}
                onPress={() => router.push("/create-board" as any)}
                testID="create-first-board"
              >
                <Text style={styles.emptyBoardsBtnText}>
                  Create your first board
                </Text>
              </Pressable>
            </View>
          ) : null}
          <CreateBoardCard />
        </View>

        {/* ── Recent Activity (only if there is real activity) ── */}
        {recentActivity.length > 0 ? (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
            </View>

            <View style={styles.activityList}>
              {recentActivity.map((item, idx) => (
                <View key={item.id}>
                  <ActivityItemRow item={item} />
                  {idx < recentActivity.length - 1 ? (
                    <View style={styles.activityDivider} />
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={boardToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBoardToDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBoardToDelete(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this board?</Text>
            <Text style={styles.modalBody}>
              This will permanently remove all suggestions, checklist items, and itinerary. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setBoardToDelete(null)}
                testID="delete-cancel-btn"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDeleteBtn, deleteBoard.isPending && { opacity: 0.6 }]}
                onPress={() => boardToDelete && deleteBoard.mutate(boardToDelete.id)}
                disabled={deleteBoard.isPending}
                testID="delete-confirm-btn"
              >
                <Text style={styles.modalDeleteText}>
                  {deleteBoard.isPending ? "Deleting\u2026" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  greetingHey: {
    fontFamily: "DMSans_400Regular",
    fontSize: 26,
    color: "#1a1a1a",
  },
  greetingName: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 26,
    color: "#1a1a1a",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },

  // Section
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#1a1a1a",
  },

  // Coming Up card
  comingUpCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    minHeight: 160,
    overflow: "hidden",
    justifyContent: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  comingUpAccentCircle: {
    position: "absolute",
    top: -28,
    right: -28,
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.18,
  },
  comingUpAccentTear: {
    position: "absolute",
    top: 0,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 8,
    opacity: 0.12,
  },
  comingUpLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  comingUpBoardName: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 32,
    marginBottom: 20,
  },
  comingUpBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comingUpMembers: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
  newPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  newPillText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },

  // Board list
  boardsList: {
    gap: 12,
  },

  // Board card
  boardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tearCircle: {
    position: "absolute",
    top: -24,
    right: -24,
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.9,
  },
  tearRect: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 40,
    borderRadius: 0,
    opacity: 0.9,
  },
  unreadBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    zIndex: 10,
  },
  unreadBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  boardCardInner: {
    padding: 16,
    gap: 6,
  },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  typePillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  boardName: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 18,
    color: "#1a1a1a",
    lineHeight: 24,
  },
  boardCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  memberStackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberStackAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  memberStackInitial: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 8,
  },
  memberCount: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
  },
  boardDate: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
  },

  // Create board card
  createCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#CCCCCC",
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  createCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  createCardTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#555555",
  },
  createCardSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
  },

  // Activity
  activityList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  activityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityAvatarText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  activityContent: {
    flex: 1,
    gap: 3,
  },
  activityText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#555555",
    lineHeight: 20,
  },
  activityName: {
    fontFamily: "DMSans_600SemiBold",
    color: "#1a1a1a",
  },
  activityAction: {
    fontFamily: "DMSans_400Regular",
    color: "#555555",
  },
  activityBoard: {
    fontFamily: "DMSans_500Medium",
    color: "#1a1a1a",
  },
  activityTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
  },
  activityDivider: {
    height: 1,
    backgroundColor: "#F4F4F4",
    marginHorizontal: 16,
  },

  // Empty state
  emptyBoards: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyBoardsTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
  },
  emptyBoardsSubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
  },
  emptyBoardsBtn: {
    marginTop: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBoardsBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  // Misc
  avatarCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "DMSans_600SemiBold",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },

  // New board header button
  newBoardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
  },
  newBoardBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Delete board modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
    marginBottom: 10,
  },
  modalBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#666666",
    lineHeight: 21,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#1a1a1a",
  },
  modalDeleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});

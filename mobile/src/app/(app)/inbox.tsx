import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { BOARD_TYPE_CONFIG, BoardType } from "@/lib/theme";
import type { InboxData, InboxPendingGroup, ActivityItem } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "foryou" | "activity";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_BG = ["#FAEEDA", "#EAF3DE", "#FBEAF0", "#EEEDFE", "#E6F1FB", "#FAECE7"];
const AVATAR_FG = ["#854F0B", "#3B6D11", "#993556", "#534AB7", "#185FA5", "#993C1D"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: AVATAR_BG[idx],
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: size * 0.35,
          color: AVATAR_FG[idx],
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BoardTypePill({ boardType }: { boardType: string }) {
  const config =
    BOARD_TYPE_CONFIG[boardType as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  return (
    <View style={[styles.boardPill, { backgroundColor: config.bg }]}>
      <Text style={[styles.boardPillText, { color: config.text }]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
}

function NotificationCard({
  suggestion,
  boardType,
  onApprove,
  onDecline,
}: {
  suggestion: InboxPendingGroup["suggestions"][number];
  boardType: string;
  onApprove: () => void;
  onDecline: () => void;
}) {
  return (
    <View
      style={styles.notificationCard}
      testID={`notification-card-${suggestion.id}`}
    >
      <View style={styles.cardRow}>
        <Avatar name={suggestion.authorName} size={40} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {suggestion.title}
          </Text>
          <Text style={styles.cardSubtitleText}>
            Suggested by {suggestion.authorName}
          </Text>
          <Text style={styles.cardTimestamp}>{timeAgo(suggestion.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          style={styles.approveBtn}
          onPress={onApprove}
          testID={`approve-${suggestion.id}`}
        >
          <Text style={styles.approveBtnText}>Approve</Text>
        </Pressable>
        <Pressable
          style={styles.declineBtn}
          onPress={onDecline}
          testID={`decline-${suggestion.id}`}
        >
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ForYouTab() {
  const queryClient = useQueryClient();

  const { data: inboxData, isLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => api.get<InboxData>("/api/inbox"),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      suggestionId,
      status,
    }: {
      suggestionId: string;
      status: "approved" | "declined";
    }) => api.patch(`/api/suggestions/${suggestionId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  if (isLoading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 48 }}
        color="#1a1a1a"
        testID="loading-indicator"
      />
    );
  }

  const groups = inboxData?.pending ?? [];

  if (groups.length === 0) {
    return (
      <View style={styles.emptyState} testID="inbox-empty">
        <Text style={styles.emptyEmoji}>{"✅"}</Text>
        <Text style={styles.emptyTitle}>All caught up</Text>
        <Text style={styles.emptySubtitle}>
          No pending suggestions to review
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {groups.map((group: InboxPendingGroup, groupIdx: number) => {
        const config =
          BOARD_TYPE_CONFIG[group.boardType as BoardType] ||
          BOARD_TYPE_CONFIG.BIRTHDAY;
        return (
          <View
            key={group.boardId}
            style={[styles.group, groupIdx > 0 && styles.groupSpacing]}
          >
            <View style={styles.groupHeader}>
              <Text style={styles.groupHeaderText}>
                {config.emoji}{"  "}
                {group.boardName.toUpperCase()}
              </Text>
            </View>
            <View style={styles.groupCards}>
              {group.suggestions.map((sugg) => (
                <NotificationCard
                  key={sugg.id}
                  suggestion={sugg}
                  boardType={group.boardType}
                  onApprove={() =>
                    statusMutation.mutate({
                      suggestionId: sugg.id,
                      status: "approved",
                    })
                  }
                  onDecline={() =>
                    statusMutation.mutate({
                      suggestionId: sugg.id,
                      status: "declined",
                    })
                  }
                />
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActivityTab() {
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.get<ActivityItem[]>("/api/activity"),
  });

  if (isLoading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 48 }}
        color="#1a1a1a"
        testID="loading-indicator"
      />
    );
  }

  if (activity.length === 0) {
    return (
      <View style={styles.emptyState} testID="activity-empty">
        <Text style={styles.emptyEmoji}>{"📋"}</Text>
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={styles.emptySubtitle}>
          Activity from your boards will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {activity.map((item) => (
        <View
          key={item.id}
          style={styles.activityItem}
          testID={`activity-item-${item.id}`}
        >
          <Avatar name={item.actorName} size={36} />
          <View style={styles.activityContent}>
            <Text style={styles.activityText} numberOfLines={3}>
              <Text style={styles.activityBold}>{item.actorName}</Text>
              {item.action === "suggested"
                ? " suggested "
                : item.action === "approved"
                ? " approved "
                : " declined "}
              <Text style={styles.activityBold}>"{item.itemTitle}"</Text>
            </Text>
            <View style={styles.activityMeta}>
              <BoardTypePill boardType={item.boardType} />
              <Text style={styles.activityTimestamp}>
                {" · "}
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "foryou", label: "For you" },
  { id: "activity", label: "Activity" },
];

export default function InboxScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("foryou");
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const { data: inboxData } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => api.get<InboxData>("/api/inbox"),
  });

  const unreadCount = inboxData?.unreadCount ?? 0;

  function handleTabPress(tab: Tab, index: number) {
    setActiveTab(tab);
    Animated.spring(underlineAnim, {
      toValue: index,
      useNativeDriver: false,
      tension: 180,
      friction: 18,
    }).start();
  }

  return (
    <SafeAreaView style={styles.container} testID="inbox-screen">
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Inbox</Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar} testID="tab-bar">
        {TABS.map((tab, index) => (
          <Pressable
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.id, index)}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}

        <Animated.View
          style={[
            styles.tabUnderline,
            {
              left: underlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "50%"],
              }),
            },
          ]}
        />
      </View>

      {/* Tab Content */}
      {activeTab === "foryou" ? <ForYouTab /> : <ActivityTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  // Top Bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#FAF9F6",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 24,
    color: "#1a1a1a",
  },
  unreadBadge: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    backgroundColor: "#FAF9F6",
    position: "relative",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    letterSpacing: 0.8,
    color: "#BBBBBB",
  },
  tabLabelActive: {
    color: "#1a1a1a",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2,
    backgroundColor: "#1a1a1a",
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // For You — Groups
  group: {},
  groupSpacing: {
    marginTop: 20,
  },
  groupHeader: {
    marginBottom: 10,
  },
  groupHeaderText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    letterSpacing: 1,
    color: "#BBBBBB",
    textTransform: "uppercase",
  },
  groupCards: {
    gap: 8,
  },

  // Notification Card
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    padding: 16,
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 19,
  },
  cardSubtitleText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
  },
  cardTimestamp: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#BBBBBB",
    marginTop: 2,
  },

  // Card Action Buttons
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  declineBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  declineBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#1a1a1a",
    letterSpacing: 0.2,
  },

  // Board Type Pill
  boardPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  boardPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    letterSpacing: 0.2,
  },

  // Activity Tab
  activityItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEE9",
  },
  activityContent: {
    flex: 1,
    gap: 6,
  },
  activityText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 20,
  },
  activityBold: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#1a1a1a",
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityTimestamp: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#BBBBBB",
  },

  // Empty states
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
  },
});

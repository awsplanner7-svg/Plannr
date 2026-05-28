import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/api";
import { BOARD_TYPE_CONFIG, BoardType } from "@/lib/theme";
import type { BoardSummary } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_ABBREVS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getDaysLabel(dateStr: string): { label: string; color: string } {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: "Today", color: "#22C55E" };
  if (days > 0) return { label: `${days} days away`, color: "#888" };
  return { label: "Past", color: "#AAA" };
}

interface MonthGroup {
  key: string;
  label: string;
  items: BoardSummary[];
}

function groupByMonth(boards: BoardSummary[]): MonthGroup[] {
  const map = new Map<string, BoardSummary[]>();
  for (const board of boards) {
    const date = board.eventDate ? new Date(board.eventDate) : null;
    const key = date
      ? `${date.getFullYear()}-${date.getMonth()}`
      : "no-date";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(board);
  }
  const groups: MonthGroup[] = [];
  for (const [key, items] of map.entries()) {
    if (key === "no-date") {
      groups.push({ key, label: "Ongoing", items });
    } else {
      const [year, month] = key.split("-").map(Number);
      groups.push({ key, label: `${MONTH_NAMES[month]} ${year}`, items });
    }
  }
  groups.sort((a, b) => {
    if (a.key === "no-date") return 1;
    if (b.key === "no-date") return -1;
    const [ay, am] = a.key.split("-").map(Number);
    const [by, bm] = b.key.split("-").map(Number);
    if (ay !== by) return ay - by;
    return am - bm;
  });
  return groups;
}


function BoardCard({ board }: { board: BoardSummary }) {
  const config =
    BOARD_TYPE_CONFIG[board.type as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  const daysInfo = board.eventDate
    ? getDaysLabel(board.eventDate)
    : { label: "Ongoing", color: "#6B7A8D" };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      onPress={() => router.push(`/board/${board.id}` as any)}
      testID={`timeline-board-${board.id}`}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.pill, { backgroundColor: config.bg }]}>
          <Text style={[styles.pillText, { color: config.text }]}>
            {config.emoji} {config.label}
          </Text>
        </View>
        <Text style={[styles.daysAway, { color: daysInfo.color }]}>
          {daysInfo.label}
        </Text>
      </View>

      <Text style={styles.cardName} numberOfLines={2}>
        {board.name}
      </Text>

      <Text style={styles.cardMeta}>
        {"👥"} {board.memberCount}{" "}
        {board.memberCount === 1 ? "member" : "members"}
        {"  •  "}
        {"💡"} {board.suggestionCount} suggestions
      </Text>

    </Pressable>
  );
}

function TimelineItem({
  board,
  isFirst,
  isLast,
}: {
  board: BoardSummary;
  isFirst: boolean;
  isLast: boolean;
}) {
  const config =
    BOARD_TYPE_CONFIG[board.type as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  const date = board.eventDate ? new Date(board.eventDate) : null;
  const day = date ? date.getDate() : null;
  const monthAbbrev = date ? MONTH_ABBREVS[date.getMonth()] : null;

  return (
    <View style={styles.timelineRow} testID={`timeline-item-${board.id}`}>
      <View style={styles.leftCol}>
        <View style={styles.lineWrapper}>
          {!isFirst && <View style={[styles.lineSegment, styles.lineTop]} />}
          {!isLast && <View style={[styles.lineSegment, styles.lineBottom]} />}
          <View style={[styles.dot, { backgroundColor: config.text }]} />
        </View>
        <View style={styles.dateLabel}>
          {day !== null ? (
            <>
              <Text style={[styles.dayNumber, { color: config.text }]}>
                {day}
              </Text>
              <Text style={styles.monthAbbrev}>{monthAbbrev}</Text>
            </>
          ) : (
            <Text style={[styles.monthAbbrev, { fontSize: 9 }]}>
              {"TBD"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <BoardCard board={board} />
      </View>
    </View>
  );
}

function MonthSection({ group }: { group: MonthGroup }) {
  return (
    <View>
      <Text style={styles.monthHeader}>{group.label.toUpperCase()}</Text>
      <View style={styles.monthItems}>
        {group.items.map((board, idx) => (
          <TimelineItem
            key={board.id}
            board={board}
            isFirst={idx === 0}
            isLast={idx === group.items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const [pastExpanded, setPastExpanded] = useState<boolean>(false);

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => api.get<BoardSummary[]>("/api/boards"),
  });

  const now = Date.now();
  const upcomingBoards = boards.filter(
    (b) => !b.eventDate || new Date(b.eventDate).getTime() >= now
  );
  const pastBoards = boards.filter(
    (b) => b.eventDate && new Date(b.eventDate).getTime() < now
  );

  const upcomingGroups = groupByMonth(upcomingBoards);
  const pastGroups = groupByMonth(pastBoards);

  function togglePast() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPastExpanded((prev) => !prev);
  }

  return (
    <SafeAreaView style={styles.container} testID="timeline-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Timeline</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            style={{ marginTop: 48 }}
            color="#1a1a1a"
            testID="loading-indicator"
          />
        ) : null}

        {!isLoading && boards.length === 0 ? (
          <View style={styles.emptyState} testID="timeline-empty">
            <Text style={styles.emptyTitle}>No boards yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a board to see it on your timeline
            </Text>
          </View>
        ) : null}

        {upcomingGroups.map((group) => (
          <MonthSection key={group.key} group={group} />
        ))}

        {pastBoards.length > 0 ? (
          <>
            <Pressable
              style={styles.pastHeader}
              onPress={togglePast}
              testID="past-boards-toggle"
            >
              <Text style={styles.pastHeaderText}>
                {pastExpanded ? "▼" : "▶"} Past boards ({pastBoards.length})
              </Text>
            </Pressable>

            {pastExpanded ? (
              <View style={styles.pastSection}>
                {pastGroups.map((group) => (
                  <View key={group.key} style={styles.pastGroupOpacity}>
                    <MonthSection group={group} />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const LEFT_COL_WIDTH = 52;
const LINE_LEFT = 20;
const DOT_SIZE = 8;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 24,
    color: "#1a1a1a",
  },
  monthHeader: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAA",
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  monthItems: {
    position: "relative",
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  leftCol: {
    width: LEFT_COL_WIDTH,
    alignItems: "center",
    position: "relative",
  },
  lineWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: LINE_LEFT - 0.75,
    width: 1.5,
    alignItems: "center",
  },
  lineSegment: {
    width: 1.5,
    backgroundColor: "#EBEBEB",
    position: "absolute",
    left: 0,
  },
  lineTop: {
    top: 0,
    bottom: "50%",
  },
  lineBottom: {
    top: "50%",
    bottom: 0,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    position: "absolute",
    top: "50%",
    marginTop: -(DOT_SIZE / 2),
    left: -(DOT_SIZE / 2 - 0.75),
  },
  dateLabel: {
    alignItems: "center",
    paddingTop: 8,
    width: LEFT_COL_WIDTH,
  },
  dayNumber: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 24,
    lineHeight: 28,
  },
  monthAbbrev: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#AAA",
    marginTop: 1,
  },
  cardWrapper: {
    flex: 1,
    paddingLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
  },
  daysAway: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
  },
  cardName: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 15,
    color: "#1a1a1a",
    marginTop: 6,
  },
  cardMeta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#888",
    marginTop: 5,
    marginBottom: 8,
  },
  pastHeader: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  pastHeaderText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#888",
  },
  pastSection: {
    overflow: "hidden",
  },
  pastGroupOpacity: {
    opacity: 0.4,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
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
  bottomPad: {
    height: 32,
  },
});

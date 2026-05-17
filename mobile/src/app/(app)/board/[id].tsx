import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  Share,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { consumeSuggestionSubmitted } from "@/lib/suggestion-submitted-signal";
import { ArrowLeft, Plus, Star, ExternalLink, ChevronLeft, MoreVertical } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { api } from "@/lib/api/api";
import { useSession } from "@/lib/auth/use-session";
import { useSendEmailInvite, useSendEmailInvites } from "@/lib/api/use-invite";
import { BOARD_TYPE_CONFIG, AFFILIATE_SOURCES, BoardType } from "@/lib/theme";
import type { BoardDetail, SuggestionWithVotes } from "@/lib/types";
import {
  useChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  type ChecklistItem,
} from "@/lib/api/use-checklist";
import {
  useItinerary,
  useCreateDay,
  useDeleteDay,
  useUpdateDay,
  useCreateItineraryItem,
  useUpdateItineraryItem,
  useDeleteItineraryItem,
  useReorderItems,
  type ItineraryDay,
  type ItineraryItem,
  type ItineraryCategory,
} from "@/lib/api/use-itinerary";
import { Swipeable } from "react-native-gesture-handler";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_BG = ["#FAEEDA", "#EAF3DE", "#FBEAF0", "#EEEDFE", "#E6F1FB", "#FAECE7"];
const AVATAR_FG = ["#854F0B", "#3B6D11", "#993556", "#534AB7", "#185FA5", "#993C1D"];

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_BG[idx], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: "DMSans_600SemiBold", fontSize: size * 0.38, color: AVATAR_FG[idx] }}>{getInitials(name)}</Text>
    </View>
  );
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return null; }
}

function extractPrice(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\$[\d,]+(\.\d{2})?/);
  return m ? m[0] : null;
}

const BOARD_THUMBNAILS: Partial<Record<BoardType, string[]>> = {
  MOVING:       ["🛋️", "💡", "🪑", "🏺", "🪞", "📦"],
  HOUSEWARMING: ["🛋️", "🕯️", "🎨", "🌿", "🪴", "🍳"],
  BACHELOR:     ["🥂", "🎰", "🛥️", "🎯", "🎪", "🌴"],
  BIRTHDAY:     ["🎂", "🎊", "🎁", "🎤", "🍾", "🎡"],
  GROUP_TRIP:   ["🏨", "🗺️", "🍽️", "🚗", "🏖️", "✈️"],
  ENGAGEMENT:   ["💐", "💒", "🥂", "💌", "🎶", "💎"],
  WEDDING:      ["💐", "🎂", "🥂", "💒", "📸", "🕊️"],
  BABY_SHOWER:  ["🍼", "👶", "🧸", "🎀", "🧷", "🛏️"],
};

function getThumbnailEmoji(boardType: string, index: number): string {
  const list = BOARD_THUMBNAILS[boardType as BoardType] ?? ["🎁", "⭐", "🛍️", "✨", "🎯", "💫"];
  return list[index % list.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ItineraryCategory, { emoji: string; label: string; bg: string; text: string }> = {
  food:     { emoji: "🍽", label: "Food",     bg: "#FFF3E0", text: "#E65100" },
  activity: { emoji: "🎯", label: "Activity", bg: "#E8F5E9", text: "#2E7D32" },
  travel:   { emoji: "✈️", label: "Travel",   bg: "#E3F2FD", text: "#1565C0" },
  stay:     { emoji: "🏨", label: "Stay",     bg: "#F3E5F5", text: "#6A1B9A" },
  other:    { emoji: "⚡", label: "Other",    bg: "#F5F5F5", text: "#616161" },
};

// ─── Checklist Category Config ────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const CHECKLIST_CATEGORIES: { key: string; label: string; icon: IoniconName }[] = [
  { key: "lodging",    label: "Lodging",      icon: "home-outline"       },
  { key: "activities", label: "Activities",   icon: "star-outline"       },
  { key: "food_drink", label: "Food & Drink", icon: "restaurant-outline" },
  { key: "transport",  label: "Transport",    icon: "car-outline"        },
  { key: "shopping",   label: "Shopping",     icon: "bag-outline"        },
  { key: "other",      label: "Other",        icon: "grid-outline"       },
];

// ─── ChecklistItemCard ────────────────────────────────────────────────────────

function ChecklistItemCard({
  item,
  boardTypeColor,
  boardTypeTextColor,
  members,
  onToggle,
  onCycleStatus,
  onDelete,
  onCategoryChange,
  onUpdate,
}: {
  item: ChecklistItem;
  boardTypeColor: string;
  boardTypeTextColor: string;
  members: Array<{ userId: string; user: { id: string; name: string; email: string } }>;
  onToggle: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
  onCategoryChange: (category: string) => void;
  onUpdate: (fields: { title?: string; description?: string | null; link?: string | null; assigneeId?: string | null }) => void;
}) {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(item.description ?? "");
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(item.link ?? "");
  const [linkContextVisible, setLinkContextVisible] = useState(false);

  function getDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }

  const statusLabel = item.status === "todo" ? "To Do" : item.status === "in_progress" ? "In Progress" : "Done";

  const statusPillStyle = item.status === "todo"
    ? { backgroundColor: "#F5F5F5" }
    : item.status === "in_progress"
    ? { backgroundColor: "#FFF8E6" }
    : { backgroundColor: boardTypeColor };

  const statusTextStyle = item.status === "todo"
    ? { color: "#888888" }
    : item.status === "in_progress"
    ? { color: "#D97706" }
    : { color: boardTypeTextColor };

  const currentCatConfig = CHECKLIST_CATEGORIES.find((c) => c.key === item.category);

  return (
    <>
      <View style={[clStyles.card, item.completed && { opacity: 0.5 }]}>
        {/* Delete button */}
        <Pressable onPress={onDelete} style={clStyles.deleteBtn} testID={`checklist-delete-${item.id}`}>
          <Text style={clStyles.deleteBtnText}>×</Text>
        </Pressable>

        {/* Row 1: checkbox + title */}
        <View style={clStyles.cardRow}>
          <Pressable onPress={onToggle} style={[clStyles.checkbox, item.completed && { backgroundColor: boardTypeColor, borderColor: boardTypeColor }]} testID={`checklist-check-${item.id}`}>
            {item.completed ? <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 18 }}>✓</Text> : null}
          </Pressable>
          {editingTitle ? (
            <TextInput
              style={[clStyles.cardTitle, clStyles.cardTitleInput]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              autoFocus
              onBlur={() => {
                const trimmed = titleDraft.trim();
                if (trimmed && trimmed !== item.title) onUpdate({ title: trimmed });
                else setTitleDraft(item.title);
                setEditingTitle(false);
              }}
              onSubmitEditing={() => {
                const trimmed = titleDraft.trim();
                if (trimmed && trimmed !== item.title) onUpdate({ title: trimmed });
                else setTitleDraft(item.title);
                setEditingTitle(false);
              }}
              returnKeyType="done"
              testID={`checklist-title-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => setEditingTitle(true)} style={{ flex: 1 }}>
              <Text style={[clStyles.cardTitle, item.completed && { textDecorationLine: "line-through" }]} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Row 2: description */}
        <View style={clStyles.descRow}>
          {editingDescription ? (
            <TextInput
              style={clStyles.descInput}
              value={descriptionDraft}
              onChangeText={setDescriptionDraft}
              placeholder="Add a note..."
              placeholderTextColor="#CCCCCC"
              multiline
              autoFocus
              onBlur={() => {
                const val = descriptionDraft.trim() || null;
                if (val !== (item.description ?? null)) onUpdate({ description: val });
                setEditingDescription(false);
              }}
              testID={`checklist-desc-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => setEditingDescription(true)}>
              <Text style={item.description ? clStyles.descText : clStyles.descPlaceholder} numberOfLines={3}>
                {item.description || "Add a note..."}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Row 3: link field — always visible */}
        <View style={clStyles.linkFieldRow}>
          {item.link ? (
            <>
              <Pressable
                onPress={() => item.link && Linking.openURL(item.link)}
                onLongPress={() => setLinkContextVisible(true)}
                style={clStyles.linkPill}
                testID={`checklist-link-${item.id}`}
              >
                <ExternalLink size={11} color="#2563EB" strokeWidth={2} />
                <Text style={clStyles.linkPillText}>{getDomain(item.link)} ↗</Text>
              </Pressable>
              {linkContextVisible ? (
                <View style={clStyles.linkContextMenu}>
                  <Pressable
                    onPress={() => { setLinkDraft(item.link ?? ""); setEditingLink(true); setLinkContextVisible(false); }}
                    style={clStyles.linkContextOption}
                  >
                    <Text style={clStyles.linkContextOptionText}>Edit link</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { onUpdate({ link: null }); setLinkContextVisible(false); }}
                    style={clStyles.linkContextOption}
                  >
                    <Text style={[clStyles.linkContextOptionText, { color: "#E53E3E" }]}>Remove link</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : editingLink ? (
            <TextInput
              style={clStyles.linkInput}
              value={linkDraft}
              onChangeText={setLinkDraft}
              placeholder="Paste a URL..."
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                const val = linkDraft.trim();
                if (val) onUpdate({ link: val });
                setEditingLink(false);
              }}
              onBlur={() => {
                const val = linkDraft.trim();
                if (val) onUpdate({ link: val });
                setEditingLink(false);
              }}
              testID={`checklist-link-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => { setLinkDraft(""); setEditingLink(true); }} testID={`checklist-add-link-${item.id}`}>
              <Text style={clStyles.addLinkText}>+ Add a link</Text>
            </Pressable>
          )}
        </View>

        {/* Row 4: status + category + assignee */}
        <View style={clStyles.cardMeta}>
          <Pressable onPress={onCycleStatus} style={[clStyles.statusPill, statusPillStyle]} testID={`checklist-status-${item.id}`}>
            <Text style={[clStyles.statusPillText, statusTextStyle]}>{statusLabel}</Text>
          </Pressable>
          {currentCatConfig ? (
            <Pressable
              onPress={() => setCategoryModalVisible(true)}
              style={clStyles.categoryTag}
              testID={`checklist-category-${item.id}`}
            >
              <Ionicons name={currentCatConfig.icon} size={11} color="#888888" />
              <Text style={clStyles.categoryTagText}>{currentCatConfig.label}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setAssigneeModalVisible(true)}
            style={clStyles.assigneeBtn}
            testID={`checklist-assignee-${item.id}`}
          >
            {item.assignee ? (
              <View style={clStyles.assigneeChip}>
                <View style={clStyles.assigneeAvatar}>
                  <Text style={clStyles.assigneeInitial}>
                    {(item.assignee.name || item.assignee.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={clStyles.assigneeName} numberOfLines={1}>{item.assignee.name || item.assignee.email}</Text>
              </View>
            ) : (
              <Text style={clStyles.assigneePlaceholder}>+ Assign</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Category picker modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
        testID={`category-modal-${item.id}`}
      >
        <Pressable style={clStyles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
          <Pressable style={clStyles.categorySheet} onPress={() => { /* prevent dismiss */ }}>
            <View style={clStyles.categorySheetHandle} />
            <Text style={clStyles.categorySheetTitle}>Change category</Text>
            {CHECKLIST_CATEGORIES.map((cat) => {
              const isActive = item.category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[clStyles.categoryOption, isActive && clStyles.categoryOptionActive]}
                  onPress={() => { onCategoryChange(cat.key); setCategoryModalVisible(false); }}
                  testID={`category-option-${cat.key}`}
                >
                  <Ionicons name={cat.icon} size={20} color={isActive ? "#1a1a1a" : "#888888"} />
                  <Text style={[clStyles.categoryOptionText, isActive && clStyles.categoryOptionTextActive]}>
                    {cat.label}
                  </Text>
                  {isActive ? (
                    <View style={clStyles.categoryOptionCheck}>
                      <Text style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 14 }}>✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            <View style={{ height: 20 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assignee picker modal */}
      <Modal
        visible={assigneeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssigneeModalVisible(false)}
        testID={`assignee-modal-${item.id}`}
      >
        <Pressable style={clStyles.modalOverlay} onPress={() => setAssigneeModalVisible(false)}>
          <Pressable style={clStyles.categorySheet} onPress={() => { /* prevent dismiss */ }}>
            <View style={clStyles.categorySheetHandle} />
            <Text style={clStyles.categorySheetTitle}>Assign to</Text>
            {item.assignee ? (
              <Pressable
                style={clStyles.categoryOption}
                onPress={() => { onUpdate({ assigneeId: null }); setAssigneeModalVisible(false); }}
                testID="assignee-unassign"
              >
                <Text style={[clStyles.categoryOptionText, { color: "#888888" }]}>Unassign</Text>
              </Pressable>
            ) : null}
            {members.map((member) => {
              const isActive = item.assigneeId === member.userId;
              const displayName = member.user.name || member.user.email;
              const initial = displayName[0]?.toUpperCase() ?? "?";
              return (
                <Pressable
                  key={member.userId}
                  style={[clStyles.categoryOption, isActive && clStyles.categoryOptionActive]}
                  onPress={() => { onUpdate({ assigneeId: member.userId }); setAssigneeModalVisible(false); }}
                  testID={`assignee-option-${member.userId}`}
                >
                  <View style={clStyles.assigneeAvatarLg}>
                    <Text style={clStyles.assigneeInitialLg}>{initial}</Text>
                  </View>
                  <Text style={[clStyles.categoryOptionText, isActive && clStyles.categoryOptionTextActive]}>
                    {displayName}
                  </Text>
                  {isActive ? (
                    <View style={clStyles.categoryOptionCheck}>
                      <Text style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 14 }}>✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            <View style={{ height: 20 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── ChecklistTab ─────────────────────────────────────────────────────────────

function ChecklistTab({
  boardId,
  boardType,
  members,
}: {
  boardId: string;
  boardType: string;
  members: Array<{ userId: string; user: { id: string; name: string; email: string } }>;
}) {
  const config = BOARD_TYPE_CONFIG[boardType as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [addingTitle, setAddingTitle] = useState<string>("");

  const { data: items = [], isLoading } = useChecklist(boardId);
  const createItem = useCreateChecklistItem(boardId);
  const updateItem = useUpdateChecklistItem(boardId);
  const deleteItem = useDeleteChecklistItem(boardId);

  const doneCount = items.filter((i) => i.completed).length;
  const total = items.length;
  const progress = total > 0 ? doneCount / total : 0;

  const progressAnim = useRef(new Animated.Value(progress)).current;

  // Animate when progress changes
  Animated.timing(progressAnim, {
    toValue: progress,
    duration: 300,
    useNativeDriver: false,
  }).start();

  // Show ALL categories so users can add to empty ones
  const categorySections = CHECKLIST_CATEGORIES.map((cat) => ({
    cat,
    sectionItems: items.filter((i) => i.category === cat.key),
  }));

  const nextStatus = (current: string): "todo" | "in_progress" | "done" => {
    if (current === "todo") return "in_progress";
    if (current === "in_progress") return "done";
    return "todo";
  };

  const handleToggle = (item: ChecklistItem) => {
    updateItem.mutate({ id: item.id, completed: !item.completed });
  };

  const handleCycleStatus = (item: ChecklistItem) => {
    updateItem.mutate({ id: item.id, status: nextStatus(item.status) });
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id);
  };

  const handleCategoryChange = (item: ChecklistItem, category: string) => {
    updateItem.mutate({ id: item.id, category });
  };

  const handleUpdate = (item: ChecklistItem, fields: { title?: string; description?: string | null; link?: string | null; assigneeId?: string | null }) => {
    updateItem.mutate({ id: item.id, ...fields });
  };

  return (
    <ScrollView contentContainerStyle={clStyles.container} showsVerticalScrollIndicator={false} testID="checklist-tab">
      {/* Progress bar */}
      <View style={clStyles.progressSection}>
        <Text style={clStyles.progressLabel}>{doneCount} of {total} items done</Text>
        <View style={clStyles.progressTrack}>
          <Animated.View
            style={[
              clStyles.progressFill,
              {
                backgroundColor: config.bg,
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              },
            ]}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a1a1a" />
      ) : null}

      {categorySections.map(({ cat, sectionItems }) => (
        sectionItems.length === 0 && addingCategory !== cat.key ? (
          // Empty category: only show a minimal add button
          <View key={cat.key} style={clStyles.emptyCategory}>
            <Pressable
              onPress={() => { setAddingTitle(""); setAddingCategory(cat.key); }}
              style={clStyles.catAddBtnEmpty}
              testID={`checklist-add-to-${cat.key}`}
            >
              <Ionicons name={cat.icon} size={13} color="#BBBBBB" />
              <Text style={clStyles.catAddBtnEmptyText}>Add {cat.label} item</Text>
            </Pressable>
          </View>
        ) : (
          <View style={clStyles.section} key={cat.key}>
            {sectionItems.length > 0 ? (
              <>
                <View style={clStyles.catSectionHeader}>
                  <Ionicons name={cat.icon} size={16} color={config.text} />
                  <Text style={[clStyles.catSectionHeaderText, { color: config.text }]}>
                    {cat.label}
                    <Text style={clStyles.catSectionCount}>{"  ·  "}{sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}</Text>
                  </Text>
                </View>
                <View style={[clStyles.catSectionDivider, { backgroundColor: config.bg }]} />
                {sectionItems.map((item) => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    boardTypeColor={config.bg}
                    boardTypeTextColor={config.text}
                    members={members}
                    onToggle={() => handleToggle(item)}
                    onCycleStatus={() => handleCycleStatus(item)}
                    onDelete={() => handleDelete(item.id)}
                    onCategoryChange={(category) => handleCategoryChange(item, category)}
                    onUpdate={(fields) => handleUpdate(item, fields)}
                  />
                ))}
              </>
            ) : null}
            {/* Per-category add item */}
            {addingCategory === cat.key ? (
              <View style={clStyles.catAddRow}>
                <TextInput
                  style={clStyles.catAddInput}
                  value={addingTitle}
                  onChangeText={setAddingTitle}
                  placeholder={`Add ${cat.label.toLowerCase()} item...`}
                  placeholderTextColor="#AAAAAA"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const t = addingTitle.trim();
                    if (t) createItem.mutate({ title: t, category: cat.key });
                    setAddingTitle("");
                    setAddingCategory(null);
                  }}
                  onBlur={() => {
                    const t = addingTitle.trim();
                    if (t) createItem.mutate({ title: t, category: cat.key });
                    setAddingTitle("");
                    setAddingCategory(null);
                  }}
                  testID={`checklist-add-input-${cat.key}`}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => { setAddingTitle(""); setAddingCategory(cat.key); }}
                style={clStyles.catAddBtn}
                testID={`checklist-add-to-${cat.key}`}
              >
                <Text style={clStyles.catAddBtnText}>+ Add item</Text>
              </Pressable>
            )}
          </View>
        )
      ))}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ─── AddToItineraryModal ──────────────────────────────────────────────────────

function AddToItineraryModal({
  visible,
  onClose,
  boardId,
  suggestion,
}: {
  visible: boolean;
  onClose: () => void;
  boardId: string;
  suggestion: { id: string; title: string; description: string | null; link: string | null } | null;
}) {
  const { data: days = [] } = useItinerary(boardId);
  const createDay = useCreateDay(boardId);
  const createItem = useCreateItineraryItem(boardId);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<ItineraryCategory>("other");
  const [title, setTitle] = useState(suggestion?.title ?? "");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState(suggestion?.link ?? "");
  const [added, setAdded] = useState(false);

  // Sync title/link when suggestion prop changes
  const prevSuggId = useRef<string | null>(null);
  if (suggestion && suggestion.id !== prevSuggId.current) {
    prevSuggId.current = suggestion.id;
    setTitle(suggestion.title);
    setLink(suggestion.link ?? "");
    setAdded(false);
  }

  const effectiveDayId = selectedDayId ?? (days.length > 0 ? days[0].id : null);

  const handleAddDay = () => {
    createDay.mutate({ dayNumber: days.length + 1 }, {
      onSuccess: (newDay) => {
        setSelectedDayId(newDay.id);
      },
    });
  };

  const handleAdd = () => {
    if (!effectiveDayId || !suggestion) return;
    createItem.mutate({
      dayId: effectiveDayId,
      title: title.trim() || suggestion.title,
      time: time.trim() || undefined,
      category,
      location: location.trim() || undefined,
      link: link.trim() || undefined,
      suggestionId: suggestion.id,
    }, {
      onSuccess: () => {
        setAdded(true);
        setTimeout(() => {
          onClose();
          setAdded(false);
        }, 800);
      },
    });
  };

  const selectedDay = days.find((d) => d.id === effectiveDayId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} testID="add-to-itinerary-modal">
      <Pressable style={itStyles.overlay} onPress={onClose}>
        <Pressable style={itStyles.bottomSheet} onPress={() => { /* prevent dismiss */ }}>
          <View style={itStyles.handle} />
          <Text style={itStyles.sheetTitle}>Add to itinerary</Text>

          {/* Day pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
            {days.map((day) => {
              const isActive = (effectiveDayId === day.id);
              return (
                <Pressable
                  key={day.id}
                  onPress={() => setSelectedDayId(day.id)}
                  style={[itStyles.dayPill, isActive && itStyles.dayPillActive]}
                >
                  <Text style={[itStyles.dayPillText, isActive && itStyles.dayPillTextActive]}>
                    Day {day.dayNumber}
                  </Text>
                </Pressable>
              );
            })}
            {/* Add new day pill */}
            <Pressable onPress={handleAddDay} style={itStyles.addDayPill}>
              <Text style={itStyles.addDayPillText}>＋ Day {days.length + 1}</Text>
            </Pressable>
          </ScrollView>

          {days.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 16, gap: 10 }}>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: "#888888" }}>No days yet — add one above</Text>
            </View>
          ) : null}

          {effectiveDayId ? (
            <>
              {/* Category picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {(Object.keys(CATEGORY_CONFIG) as ItineraryCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const isActive = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[itStyles.categoryPill, isActive && { backgroundColor: "#1a1a1a" }]}
                    >
                      <Text style={[itStyles.categoryPillText, isActive && { color: "#FFFFFF" }]}>
                        {cfg.emoji} {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Time + Title row */}
              <View style={itStyles.twoCol}>
                <TextInput
                  style={[itStyles.input, { flex: 0, width: "38%" }]}
                  placeholder="7:00 PM"
                  placeholderTextColor="#AAAAAA"
                  value={time}
                  onChangeText={setTime}
                />
                <TextInput
                  style={[itStyles.input, { flex: 1 }]}
                  placeholder="Title"
                  placeholderTextColor="#AAAAAA"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <TextInput
                style={itStyles.input}
                placeholder="Location or address"
                placeholderTextColor="#AAAAAA"
                value={location}
                onChangeText={setLocation}
              />
              <TextInput
                style={itStyles.input}
                placeholder="Link (optional)"
                placeholderTextColor="#AAAAAA"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
              />

              <Pressable
                onPress={handleAdd}
                style={[itStyles.primaryBtn, added && { backgroundColor: "#2E7D32" }]}
                testID="add-to-itinerary-confirm"
              >
                <Text style={itStyles.primaryBtnText}>
                  {added ? "Added!" : createItem.isPending ? "Adding..." : `Add to Day ${selectedDay?.dayNumber ?? ""}`}
                </Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ItineraryItemCard ────────────────────────────────────────────────────────

function ItineraryItemCard({
  item,
  boardId,
  isLast,
  accentColor,
  editMode,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
}: {
  item: ItineraryItem;
  boardId: string;
  isLast: boolean;
  isFirst: boolean;
  accentColor: string;
  editMode: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const updateItem = useUpdateItineraryItem(boardId);
  const catCfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other;

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [editingTime, setEditingTime] = useState(false);
  const [timeDraft, setTimeDraft] = useState(item.time ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(item.description ?? "");
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(item.link ?? "");
  const [linkContextVisible, setLinkContextVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState(item.location ?? "");
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);

  function getDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }

  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <Pressable
      style={itStyles.swipeDeleteBtn}
      onPress={() => { swipeableRef.current?.close(); onDelete(); }}
    >
      <Text style={itStyles.swipeDeleteText}>Delete</Text>
    </Pressable>
  );

  const cardContent = (
    <View style={itStyles.itemCard}>
      {/* Edit mode: reorder controls on left side */}
      {editMode ? (
        <View style={itStyles.reorderControls}>
          <Pressable onPress={onMoveUp} disabled={isFirst} style={[itStyles.reorderBtn, isFirst && { opacity: 0.3 }]}>
            <Text style={itStyles.reorderBtnText}>↑</Text>
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={isLast} style={[itStyles.reorderBtn, isLast && { opacity: 0.3 }]}>
            <Text style={itStyles.reorderBtnText}>↓</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[itStyles.itemCardInner, editMode && { marginLeft: 32 }]}>
        {/* Row 1: emoji category + title + time */}
        <View style={itStyles.itemRow}>
          <Pressable onPress={() => setCategorySheetVisible(true)}>
            <Text style={itStyles.itemEmoji}>{catCfg.emoji}</Text>
          </Pressable>
          {editingTitle ? (
            <TextInput
              style={[itStyles.itemTitle, itStyles.itemTitleInput]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              autoFocus
              returnKeyType="done"
              onBlur={() => {
                const v = titleDraft.trim();
                if (v && v !== item.title) updateItem.mutate({ id: item.id, title: v });
                else setTitleDraft(item.title);
                setEditingTitle(false);
              }}
              onSubmitEditing={() => {
                const v = titleDraft.trim();
                if (v && v !== item.title) updateItem.mutate({ id: item.id, title: v });
                else setTitleDraft(item.title);
                setEditingTitle(false);
              }}
              testID={`item-title-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => setEditingTitle(true)} style={{ flex: 1 }}>
              <Text style={itStyles.itemTitle} numberOfLines={2}>{item.title}</Text>
            </Pressable>
          )}
          {/* Time field */}
          {editingTime ? (
            <TextInput
              style={itStyles.timeInput}
              value={timeDraft}
              onChangeText={setTimeDraft}
              placeholder="7:00 PM"
              placeholderTextColor="#CCCCCC"
              autoFocus
              returnKeyType="done"
              onBlur={() => {
                const v = timeDraft.trim() || null;
                if (v !== (item.time ?? null)) updateItem.mutate({ id: item.id, time: v ?? undefined });
                setEditingTime(false);
              }}
              onSubmitEditing={() => {
                const v = timeDraft.trim() || null;
                if (v !== (item.time ?? null)) updateItem.mutate({ id: item.id, time: v ?? undefined });
                setEditingTime(false);
              }}
              testID={`item-time-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => setEditingTime(true)} style={itStyles.timeBtn}>
              <Text style={item.time ? itStyles.timeText : itStyles.timePlaceholder}>
                {item.time ?? "+ Time"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Row 2: description */}
        {editingDesc ? (
          <TextInput
            style={itStyles.descInput}
            value={descDraft}
            onChangeText={setDescDraft}
            placeholder="Add a description..."
            placeholderTextColor="#CCCCCC"
            multiline
            autoFocus
            onBlur={() => {
              const v = descDraft.trim() || null;
              if (v !== (item.description ?? null)) updateItem.mutate({ id: item.id, description: v ?? undefined });
              setEditingDesc(false);
            }}
            testID={`item-desc-input-${item.id}`}
          />
        ) : (
          <Pressable onPress={() => setEditingDesc(true)}>
            <Text style={item.description ? itStyles.itemDesc : itStyles.descPlaceholder} numberOfLines={3}>
              {item.description ?? "+ Add description"}
            </Text>
          </Pressable>
        )}

        {/* Row 3: link — ALWAYS VISIBLE */}
        <View style={itStyles.linkFieldRow}>
          {item.link ? (
            <>
              <Pressable
                onPress={() => item.link && Linking.openURL(item.link)}
                onLongPress={() => setLinkContextVisible(true)}
                style={itStyles.linkPill}
                testID={`item-link-${item.id}`}
              >
                <ExternalLink size={11} color="#2563EB" strokeWidth={2} />
                <Text style={itStyles.linkPillText}>{getDomain(item.link)} ↗</Text>
              </Pressable>
              {linkContextVisible ? (
                <View style={itStyles.linkContextMenu}>
                  <Pressable
                    onPress={() => { setLinkDraft(item.link ?? ""); setEditingLink(true); setLinkContextVisible(false); }}
                    style={itStyles.linkContextOption}
                  >
                    <Text style={itStyles.linkContextText}>Edit link</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { updateItem.mutate({ id: item.id, link: undefined }); setLinkContextVisible(false); }}
                    style={itStyles.linkContextOption}
                  >
                    <Text style={[itStyles.linkContextText, { color: "#E53E3E" }]}>Remove link</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : editingLink ? (
            <TextInput
              style={itStyles.linkInput}
              value={linkDraft}
              onChangeText={setLinkDraft}
              placeholder="Paste a URL..."
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                const v = linkDraft.trim();
                if (v) updateItem.mutate({ id: item.id, link: v });
                setEditingLink(false);
              }}
              onBlur={() => {
                const v = linkDraft.trim();
                if (v) updateItem.mutate({ id: item.id, link: v });
                setEditingLink(false);
              }}
              testID={`item-link-input-${item.id}`}
            />
          ) : (
            <Pressable onPress={() => { setLinkDraft(""); setEditingLink(true); }}>
              <Text style={itStyles.addLinkText}>+ Add a link</Text>
            </Pressable>
          )}
        </View>

        {/* Row 4: location */}
        {editingLocation ? (
          <TextInput
            style={itStyles.locationInput}
            value={locationDraft}
            onChangeText={setLocationDraft}
            placeholder="Add location or address..."
            placeholderTextColor="#CCCCCC"
            autoFocus
            returnKeyType="done"
            onBlur={() => {
              const v = locationDraft.trim() || null;
              if (v !== (item.location ?? null)) updateItem.mutate({ id: item.id, location: v ?? undefined });
              setEditingLocation(false);
            }}
            onSubmitEditing={() => {
              const v = locationDraft.trim() || null;
              if (v !== (item.location ?? null)) updateItem.mutate({ id: item.id, location: v ?? undefined });
              setEditingLocation(false);
            }}
            testID={`item-location-input-${item.id}`}
          />
        ) : (
          <Pressable onPress={() => setEditingLocation(true)}>
            {item.location ? (
              <View style={itStyles.itemLocRow}>
                <Text style={itStyles.itemLocIcon}>📍</Text>
                <Text style={itStyles.itemLoc} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : (
              <Text style={itStyles.locationPlaceholder}>+ Add location</Text>
            )}
          </Pressable>
        )}

        {/* Row 5: category pill + edit mode delete */}
        <View style={itStyles.itemMeta}>
          <Pressable onPress={() => setCategorySheetVisible(true)} style={[itStyles.catPill, { backgroundColor: catCfg.bg }]}>
            <Text style={[itStyles.catPillText, { color: catCfg.text }]}>{catCfg.emoji} {catCfg.label}</Text>
          </Pressable>
          {item.lastEditedBy ? (
            <Text style={itStyles.editedByText}>Edited by {item.lastEditedBy.name}</Text>
          ) : null}
          {editMode ? (
            <Pressable onPress={onDelete} style={itStyles.editModeDeleteBtn} testID={`itinerary-delete-${item.id}`}>
              <Text style={itStyles.editModeDeleteText}>✕ Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <>
      <View style={itStyles.timelineRow}>
        {/* Left: dot + line */}
        <View style={itStyles.lineCol}>
          <View style={[itStyles.dot, { backgroundColor: accentColor }]} />
          {!isLast ? <View style={[itStyles.line, { backgroundColor: accentColor }]} /> : null}
        </View>

        {/* Right: card with swipe-to-delete (only when not in edit mode) */}
        {editMode ? cardContent : (
          <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            containerStyle={{ flex: 1 }}
          >
            {cardContent}
          </Swipeable>
        )}
      </View>

      {/* Category picker sheet */}
      <Modal
        visible={categorySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategorySheetVisible(false)}
      >
        <Pressable style={itStyles.overlay} onPress={() => setCategorySheetVisible(false)}>
          <Pressable style={itStyles.bottomSheet} onPress={() => {}}>
            <View style={itStyles.handle} />
            <Text style={itStyles.sheetTitle}>Change category</Text>
            {(Object.keys(CATEGORY_CONFIG) as ItineraryCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const isActive = item.category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[itStyles.categoryOptionRow, isActive && itStyles.categoryOptionRowActive]}
                  onPress={() => {
                    updateItem.mutate({ id: item.id, category: cat });
                    setCategorySheetVisible(false);
                  }}
                >
                  <Text style={itStyles.categoryOptionEmoji}>{cfg.emoji}</Text>
                  <Text style={[itStyles.categoryOptionLabel, isActive && { color: "#1a1a1a", fontFamily: "DMSans_600SemiBold" }]}>
                    {cfg.label}
                  </Text>
                  {isActive ? <Text style={itStyles.categoryOptionCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <View style={{ height: 20 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── ItineraryDay Section ─────────────────────────────────────────────────────

function ItineraryDaySection({
  day,
  boardId,
  accentColor,
  collapsed,
  editMode,
  onToggleCollapse,
  onDeleteDay,
  onReorder,
}: {
  day: ItineraryDay;
  boardId: string;
  accentColor: string;
  collapsed: boolean;
  editMode: boolean;
  onToggleCollapse: () => void;
  onDeleteDay: () => void;
  onReorder: (dayId: string, itemIds: string[]) => void;
}) {
  const createItem = useCreateItineraryItem(boardId);
  const deleteItem = useDeleteItineraryItem(boardId);
  const updateDay = useUpdateDay(boardId);

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(day.label ?? `Day ${day.dayNumber}`);
  const [addingItem, setAddingItem] = useState(false);
  const [addingTitle, setAddingTitle] = useState("");

  const displayLabel = day.label || `Day ${day.dayNumber}`;

  const handleMoveUp = (item: ItineraryItem) => {
    const idx = day.items.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const newOrder = [...day.items];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onReorder(day.id, newOrder.map((i) => i.id));
  };

  const handleMoveDown = (item: ItineraryItem) => {
    const idx = day.items.findIndex((i) => i.id === item.id);
    if (idx < 0 || idx >= day.items.length - 1) return;
    const newOrder = [...day.items];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onReorder(day.id, newOrder.map((i) => i.id));
  };

  const dateLabel = day.date
    ? new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : null;

  return (
    <View style={itStyles.daySection}>
      {/* Day header */}
      <View style={itStyles.dayHeader}>
        <View style={itStyles.dayHeaderLeft}>
          {editingLabel ? (
            <TextInput
              style={itStyles.dayLabelInput}
              value={labelDraft}
              onChangeText={setLabelDraft}
              autoFocus
              returnKeyType="done"
              onBlur={() => {
                const v = labelDraft.trim();
                if (v) {
                  updateDay.mutate({ dayId: day.id, label: v === `Day ${day.dayNumber}` ? null : v });
                } else {
                  setLabelDraft(displayLabel);
                }
                setEditingLabel(false);
              }}
              onSubmitEditing={() => {
                const v = labelDraft.trim();
                if (v) {
                  updateDay.mutate({ dayId: day.id, label: v === `Day ${day.dayNumber}` ? null : v });
                } else {
                  setLabelDraft(displayLabel);
                }
                setEditingLabel(false);
              }}
              testID={`day-label-input-${day.id}`}
            />
          ) : (
            <Pressable onPress={() => { setLabelDraft(displayLabel); setEditingLabel(true); }} testID={`day-header-${day.id}`}>
              <Text style={itStyles.dayNumber}>{displayLabel}</Text>
            </Pressable>
          )}
          {dateLabel && !editingLabel ? (
            <Text style={itStyles.dayDate}>{dateLabel}</Text>
          ) : null}
          <View style={itStyles.itemCountBadge}>
            <Text style={itStyles.itemCountText}>{day.items.length}</Text>
          </View>
        </View>
        <View style={itStyles.dayHeaderRight}>
          {editMode ? (
            <Pressable onPress={onDeleteDay} style={itStyles.dayDeleteBtn} testID={`day-delete-${day.id}`}>
              <Text style={itStyles.dayDeleteText}>×</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onToggleCollapse}>
            <Text style={itStyles.chevron}>{collapsed ? "▶" : "▼"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Items */}
      {!collapsed ? (
        <View style={itStyles.itemsList}>
          {day.items.length === 0 && !addingItem ? (
            <Text style={itStyles.noItemsText}>No items yet — tap "+ Add item" below.</Text>
          ) : null}
          {day.items.map((item, idx) => (
            <ItineraryItemCard
              key={item.id}
              item={item}
              boardId={boardId}
              isLast={idx === day.items.length - 1}
              isFirst={idx === 0}
              accentColor={accentColor}
              editMode={editMode}
              onDelete={() => deleteItem.mutate(item.id)}
              onMoveUp={() => handleMoveUp(item)}
              onMoveDown={() => handleMoveDown(item)}
            />
          ))}
          {/* Add item row */}
          {addingItem ? (
            <View style={itStyles.addItemRow}>
              <TextInput
                style={itStyles.addItemInput}
                value={addingTitle}
                onChangeText={setAddingTitle}
                placeholder="Item title..."
                placeholderTextColor="#AAAAAA"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  const t = addingTitle.trim();
                  if (t) createItem.mutate({ dayId: day.id, title: t });
                  setAddingTitle("");
                  setAddingItem(false);
                }}
                onBlur={() => {
                  const t = addingTitle.trim();
                  if (t) createItem.mutate({ dayId: day.id, title: t });
                  setAddingTitle("");
                  setAddingItem(false);
                }}
                testID={`add-item-input-${day.id}`}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => { setAddingTitle(""); setAddingItem(true); }}
              style={itStyles.addItemBtn}
              testID={`add-item-btn-${day.id}`}
            >
              <Text style={itStyles.addItemBtnText}>+ Add item</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── ItineraryTab ─────────────────────────────────────────────────────────────

function generateShareText(days: ItineraryDay[]): string {
  const lines: string[] = ["🗓 Itinerary", ""];
  for (const day of days) {
    lines.push(`Day ${day.dayNumber}`);
    if (day.items.length === 0) {
      lines.push("  (no items)");
    } else {
      for (const item of day.items) {
        const timePart = item.time ? `${item.time} — ` : "";
        const locationPart = item.location ? ` at ${item.location}` : "";
        lines.push(`${timePart}${item.title}${locationPart}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function ItineraryTab({
  boardId,
  boardType,
}: {
  boardId: string;
  boardType: BoardType;
}) {
  const config = BOARD_TYPE_CONFIG[boardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  const { data: days = [], isLoading } = useItinerary(boardId);
  const createDay = useCreateDay(boardId);
  const deleteDay = useDeleteDay(boardId);
  const reorderItems = useReorderItems(boardId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [sharePromptVisible, setSharePromptVisible] = useState(false);
  const [shareLinkDrafts, setShareLinkDrafts] = useState<Record<string, string>>({});
  const updateItem = useUpdateItineraryItem(boardId);

  const totalItems = days.reduce((sum, d) => sum + d.items.length, 0);

  const toggleCollapse = (dayId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleAddDay = () => {
    createDay.mutate({ dayNumber: days.length + 1 });
  };

  const handleShare = () => {
    // Collect all items missing links
    const itemsMissingLinks = days.flatMap((d) =>
      d.items.filter((i) => !i.link).map((i) => ({ ...i, dayLabel: d.label || `Day ${d.dayNumber}` }))
    );
    if (itemsMissingLinks.length > 0) {
      setShareLinkDrafts({});
      setSharePromptVisible(true);
    } else {
      Share.share({ message: generateShareText(days) });
    }
  };

  const doShare = () => {
    // Save any drafted links
    Object.entries(shareLinkDrafts).forEach(([itemId, url]) => {
      if (url.trim()) updateItem.mutate({ id: itemId, link: url.trim() });
    });
    setSharePromptVisible(false);
    Share.share({ message: generateShareText(days) });
  };

  const handleReorder = (dayId: string, itemIds: string[]) => {
    reorderItems.mutate({ dayId, itemIds });
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 48 }} color="#1a1a1a" />;
  }

  return (
    <ScrollView contentContainerStyle={itStyles.tabContainer} showsVerticalScrollIndicator={false} testID="itinerary-tab">
      {/* Summary bar */}
      <View style={itStyles.summaryBar}>
        <Text style={itStyles.summaryText}>
          {days.length} {days.length === 1 ? "day" : "days"}{"  •  "}{totalItems} {totalItems === 1 ? "item" : "items"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setEditMode((v) => !v)}
            style={[itStyles.editModeToggle, editMode && itStyles.editModeToggleActive]}
            testID="edit-mode-toggle"
          >
            <Text style={[itStyles.editModeToggleText, editMode && itStyles.editModeToggleTextActive]}>
              {editMode ? "Done" : "Edit"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} style={itStyles.shareBtn} testID="itinerary-share">
            <Text style={itStyles.shareBtnText}>Share ↗</Text>
          </Pressable>
        </View>
      </View>

      {/* Empty state */}
      {days.length === 0 ? (
        <View style={itStyles.emptyState}>
          <Text style={itStyles.emptyEmoji}>🗓</Text>
          <Text style={itStyles.emptyTitle}>No itinerary yet</Text>
          <Text style={itStyles.emptySubtitle}>Add your first day to get started</Text>
          <Pressable onPress={handleAddDay} style={itStyles.primaryBtn} testID="add-first-day">
            <Text style={itStyles.primaryBtnText}>＋ Add Day 1</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Day sections */}
      {days.map((day) => (
        <ItineraryDaySection
          key={day.id}
          day={day}
          boardId={boardId}
          accentColor={config.bg}
          collapsed={!!collapsed[day.id]}
          editMode={editMode}
          onToggleCollapse={() => toggleCollapse(day.id)}
          onDeleteDay={() => deleteDay.mutate(day.id)}
          onReorder={handleReorder}
        />
      ))}

      {/* Add next day */}
      {days.length > 0 ? (
        <Pressable onPress={handleAddDay} style={itStyles.addDayRow} testID="add-next-day">
          <Text style={itStyles.addDayRowText}>＋ Add Day {days.length + 1}</Text>
        </Pressable>
      ) : null}

      <View style={{ height: 120 }} />

      {/* Share — missing links prompt */}
      <Modal
        visible={sharePromptVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSharePromptVisible(false)}
        testID="share-prompt-modal"
      >
        <Pressable style={itStyles.overlay} onPress={() => setSharePromptVisible(false)}>
          <Pressable style={[itStyles.bottomSheet, { maxHeight: "80%" }]} onPress={() => {}}>
            <View style={itStyles.handle} />
            <Text style={itStyles.sheetTitle}>Some items are missing links</Text>
            <Text style={itStyles.shareMissingSubtitle}>
              Add links so your group can book directly. Tap each field to paste a URL.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {days.flatMap((d) =>
                d.items.filter((i) => !i.link).map((item) => (
                  <View key={item.id} style={itStyles.shareMissingItem}>
                    <Text style={itStyles.shareMissingItemTitle} numberOfLines={1}>
                      {CATEGORY_CONFIG[item.category]?.emoji} {item.title}
                    </Text>
                    <TextInput
                      style={itStyles.shareMissingInput}
                      value={shareLinkDrafts[item.id] ?? ""}
                      onChangeText={(v) => setShareLinkDrafts((prev) => ({ ...prev, [item.id]: v }))}
                      placeholder="Paste a URL..."
                      placeholderTextColor="#AAAAAA"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      testID={`share-link-input-${item.id}`}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={doShare}
              style={[itStyles.primaryBtn, { marginTop: 12 }]}
              testID="share-done-btn"
            >
              <Text style={itStyles.primaryBtnText}>Done — Share</Text>
            </Pressable>
            <Pressable
              onPress={() => { setSharePromptVisible(false); Share.share({ message: generateShareText(days) }); }}
              style={{ alignItems: "center", paddingVertical: 10 }}
              testID="share-anyway-btn"
            >
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: "#888888" }}>Share anyway</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  suggestion, isCreator, boardType, index, boardId, onVote, onApprove, onDecline, onAddToChecklist, onAddToItinerary, onAddLink,
}: {
  suggestion: SuggestionWithVotes;
  isCreator: boolean;
  boardType: string;
  index: number;
  boardId: string;
  onVote: () => void;
  onApprove: () => void;
  onDecline: () => void;
  onAddToChecklist: (title: string, id: string, link: string | null, description: string | null) => void;
  onAddToItinerary: (sugg: { id: string; title: string; description: string | null; link: string | null }) => void;
  onAddLink: (url: string) => void;
}) {
  const [addingLink, setAddingLink] = useState<boolean>(false);
  const [linkDraft, setLinkDraft] = useState<string>("");
  const isPending = suggestion.status === "pending";
  const domain = extractDomain(suggestion.url);
  const price = extractPrice(suggestion.description);
  const emoji = getThumbnailEmoji(boardType, index);
  const config = BOARD_TYPE_CONFIG[boardType as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;

  return (
    <View
      style={[styles.productCard, isPending && styles.productCardPending]}
      testID={`suggestion-card-${suggestion.id}`}
    >
      {/* Main content row */}
      <View style={styles.productMain}>
        {/* Thumbnail */}
        <View style={[styles.thumbnail, { backgroundColor: config.bg }]}>
          <Text style={styles.thumbnailEmoji}>{emoji}</Text>
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{suggestion.title}</Text>
          {suggestion.description ? (
            <Text style={styles.productDescription} numberOfLines={2}>{suggestion.description}</Text>
          ) : null}
          {domain ? (
            <Text style={styles.productSource}>{domain}</Text>
          ) : null}
          {price ? <Text style={styles.productPrice}>{price}</Text> : null}

          {/* Upvote */}
          <Pressable
            style={[styles.upvoteBtn, suggestion.userVoted && styles.upvoteBtnActive]}
            onPress={onVote}
            testID={`upvote-${suggestion.id}`}
          >
            <Star
              size={12}
              color={suggestion.userVoted ? "#FFFFFF" : "#1a1a1a"}
              fill={suggestion.userVoted ? "#FFFFFF" : "none"}
              strokeWidth={2}
            />
            <Text style={[styles.upvoteCount, suggestion.userVoted && styles.upvoteCountActive]}>
              {suggestion.voteCount}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      {!isPending ? (
        <View style={styles.cardFooter}>
          <View style={styles.footerSecondaryActions}>
            <Pressable
              onPress={() => onAddToChecklist(suggestion.title, suggestion.id, suggestion.url ?? null, suggestion.description ?? null)}
              style={styles.secondaryActionBtn}
              testID={`checklist-btn-${suggestion.id}`}
            >
              <Text style={styles.secondaryActionBtnText}>＋ Checklist</Text>
            </Pressable>
            <Pressable
              onPress={() => onAddToItinerary({ id: suggestion.id, title: suggestion.title, description: suggestion.description, link: suggestion.url ?? null })}
              style={styles.secondaryActionBtn}
              testID={`itinerary-btn-${suggestion.id}`}
            >
              <Text style={styles.secondaryActionBtnText}>＋ Itinerary</Text>
            </Pressable>
          </View>
          {suggestion.url ? (
            <Pressable
              onPress={() => Linking.openURL(suggestion.url as string)}
              testID={`shop-${suggestion.id}`}
            >
              <Text style={styles.shopNow}>
                {suggestion.type === "experience" ? "Book now" : "Shop now"} ↗
              </Text>
            </Pressable>
          ) : null}
          {/* Add link nudge for approved suggestions with no URL */}
          {!isPending && !suggestion.url ? (
            <View style={styles.addLinkNudge}>
              {addingLink ? (
                <View style={styles.addLinkInputRow}>
                  <TextInput
                    style={styles.addLinkInput}
                    value={linkDraft}
                    onChangeText={setLinkDraft}
                    placeholder="Paste a URL..."
                    placeholderTextColor="#AAAAAA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      const v = linkDraft.trim();
                      if (v) { onAddLink(v); }
                      setAddingLink(false);
                      setLinkDraft("");
                    }}
                    onBlur={() => {
                      const v = linkDraft.trim();
                      if (v) { onAddLink(v); }
                      setAddingLink(false);
                      setLinkDraft("");
                    }}
                    testID={`suggestion-link-input-${suggestion.id}`}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => { setLinkDraft(""); setAddingLink(true); }}
                  testID={`suggestion-add-link-${suggestion.id}`}
                >
                  <Text style={styles.addLinkNudgeText}>+ Add a link</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.pendingFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingFooterText}>
              <Text style={{ fontFamily: "DMSans_600SemiBold" }}>{suggestion.author.name}</Text>
              {" suggested · approve?"}
            </Text>
          </View>
          {isCreator ? (
            <View style={styles.approvalBtns}>
              <Pressable
                onPress={onApprove}
                style={styles.approveBtn}
                testID={`approve-${suggestion.id}`}
              >
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
              <Pressable
                onPress={onDecline}
                style={styles.declineBtn}
                testID={`decline-${suggestion.id}`}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── BoardDetailScreen ────────────────────────────────────────────────────────

const FIXED_TABS = ["Suggestions", "Checklist", "Itinerary", "Chat"] as const;
type FixedTab = typeof FIXED_TABS[number];

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<FixedTab>("Suggestions");
  const [pendingChecklist, setPendingChecklist] = useState<{ title: string; id: string; link: string | null; description: string | null } | null>(null);
  const [itinerarySuggestion, setItinerarySuggestion] = useState<{ id: string; title: string; description: string | null; link: string | null } | null>(null);
  const [pendingLinkApproval, setPendingLinkApproval] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [linkApprovalDraft, setLinkApprovalDraft] = useState<string>("");
  const tabAnim = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("Suggestion submitted — waiting for approval");
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showEditName, setShowEditName] = useState<boolean>(false);
  const [showEditType, setShowEditType] = useState<boolean>(false);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [editTypeValue, setEditTypeValue] = useState<string>("");
  const sendEmailInvites = useSendEmailInvites();

  const showToast = useCallback((message?: string) => {
    if (message) setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setToastVisible(false);
      });
    }, 2000);
  }, [toastAnim]);

  useFocusEffect(
    useCallback(() => {
      if (consumeSuggestionSubmitted()) {
        setActiveTab("Suggestions");
        Animated.spring(tabAnim, { toValue: 0, useNativeDriver: false }).start();
        showToast("Suggestion submitted — waiting for approval");
      }
    }, [tabAnim, showToast])
  );

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ["board", id],
    queryFn: () => api.get<BoardDetail>(`/api/boards/${id}`),
    enabled: !!id,
  });

  const createChecklistItem = useCreateChecklistItem(id ?? "");

  const voteMutation = useMutation({
    mutationFn: (suggestionId: string) =>
      api.post<{ voted: boolean; voteCount: number }>(`/api/suggestions/${suggestionId}/vote`, {}),
    onMutate: async (suggestionId) => {
      await queryClient.cancelQueries({ queryKey: ["board", id] });
      const prev = queryClient.getQueryData<BoardDetail>(["board", id]);
      if (prev) {
        queryClient.setQueryData<BoardDetail>(["board", id], {
          ...prev,
          suggestions: prev.suggestions.map((s) =>
            s.id === suggestionId
              ? { ...s, userVoted: !s.userVoted, voteCount: s.userVoted ? s.voteCount - 1 : s.voteCount + 1 }
              : s
          ),
        });
      }
      return { prev };
    },
    onError: (_err: any, _sid: string, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["board", id], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", id] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ suggestionId, status }: { suggestionId: string; status: "approved" | "declined" }) =>
      api.patch(`/api/suggestions/${suggestionId}`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board", id] });
      // After approving, show the "Add to checklist?" prompt
      if (variables.status === "approved") {
        const s = board?.suggestions.find((s) => s.id === variables.suggestionId);
        if (s) {
          if (!s.url) {
            // No link — show link prompt first, then checklist
            setPendingLinkApproval({ id: s.id, title: s.title, description: s.description ?? null });
          } else {
            // Has a link — go straight to checklist
            setPendingChecklist({ title: s.title, id: s.id, link: s.url ?? null, description: s.description ?? null });
          }
        }
      }
    },
  });

  const updateSuggestionUrl = useMutation({
    mutationFn: ({ suggestionId, url }: { suggestionId: string; url: string }) =>
      api.patch(`/api/suggestions/${suggestionId}/url`, { url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", id] }),
  });

  const updateBoardMutation = useMutation({
    mutationFn: (data: { name?: string; type?: string }) => api.patch(`/api/boards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", id] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setShowEditName(false);
      setShowEditType(false);
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => api.delete(`/api/boards/${id}`),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      router.replace("/(app)" as any);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <Text style={{ fontSize: 40 }}>🔗</Text>
          <Text style={{ fontFamily: "Fraunces_700Bold_Italic", fontSize: 22, color: "#1a1a1a", textAlign: "center" }}>Board not found</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: "#888888", textAlign: "center" }}>This board may have been removed or you may not have access.</Text>
          <Pressable onPress={() => router.replace("/(app)" as any)} style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 28, backgroundColor: "#1a1a1a", borderRadius: 12 }}>
            <Text style={{ fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#FFFFFF" }}>Go home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !board) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 80 }} color="#1a1a1a" testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  const config = BOARD_TYPE_CONFIG[board.type as BoardType] || BOARD_TYPE_CONFIG.BIRTHDAY;
  const affiliates = AFFILIATE_SOURCES[board.type as BoardType] || [];
  const isCreator = board.creatorId === session?.user?.id;

  const approved = board.suggestions.filter((s) => s.status === "approved").sort((a, b) => b.voteCount - a.voteCount);
  const pending = board.suggestions.filter((s) => s.status === "pending");

  const proceedToChecklist = (approvedSuggestion: { id: string; title: string; description: string | null }, savedLink?: string) => {
    setPendingLinkApproval(null);
    setLinkApprovalDraft("");
    setPendingChecklist({
      title: approvedSuggestion.title,
      id: approvedSuggestion.id,
      link: savedLink ?? null,
      description: approvedSuggestion.description,
    });
  };

  const handleTabPress = (tab: FixedTab) => {
    const idx = FIXED_TABS.indexOf(tab);
    Animated.spring(tabAnim, {
      toValue: idx,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} testID="board-detail-screen">
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-button">
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>{board.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isCreator ? (
            <Pressable
              onPress={() => setShowSettingsMenu(true)}
              style={styles.settingsBtn}
              testID="board-settings-btn"
            >
              <MoreVertical size={20} color="#1a1a1a" strokeWidth={2} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push(`/board/${id}/add-suggestion` as any)}
            style={styles.addBtn}
            testID="add-suggestion-top"
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* BOARD META */}
      <View style={styles.boardMeta}>
        <Text style={styles.metaText}>{board.members.length} {board.members.length === 1 ? "member" : "members"}</Text>
        <View style={styles.metaDot} />
        <Text style={styles.metaText}>{board.suggestions.length} suggestions</Text>
        <View style={styles.metaDot} />
        <Text style={styles.metaText}>
          {board.eventDate
            ? new Date(board.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Ongoing"}
        </Text>
      </View>

      {/* INVITE PEOPLE BUTTON */}
      <Pressable
        style={styles.invitePeopleBtn}
        onPress={() => {
          setInviteEmailInput("");
          setInviteEmails([]);
          setLinkCopied(false);
          setInviteSheetVisible(true);
        }}
        testID="invite-button"
      >
        <Ionicons name="person-add-outline" size={16} color="#444444" />
        <Text style={styles.invitePeopleBtnText}>Invite people</Text>
      </Pressable>

      {/* AFFILIATE BANNER */}
      {affiliates.length > 0 && (
        <View style={[styles.affiliateBanner, { backgroundColor: config.bg }]}>
          <Text style={styles.affiliateEmoji}>{config.emoji}</Text>
          <Text style={[styles.affiliateText, { color: config.text }]} numberOfLines={1}>
            {config.label} board · {affiliates.slice(0, 3).join(", ")}
            {affiliates.length > 3 ? " & more" : null}
          </Text>
        </View>
      )}

      {/* 4 FIXED TABS */}
      <View style={styles.tabBar}>
        {FIXED_TABS.map((tab, idx) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={styles.tabBarItem}
              onPress={() => handleTabPress(tab)}
              testID={`tab-${tab.toLowerCase()}`}
            >
              <Text style={[styles.tabBarLabel, isActive && styles.tabBarLabelActive]}>
                {tab}
              </Text>
              {isActive ? <View style={styles.tabBarUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* MAIN CONTENT */}
      {activeTab === "Checklist" ? (
        <ChecklistTab boardId={id ?? ""} boardType={board.type} members={board.members} />
      ) : activeTab === "Itinerary" ? (
        <ItineraryTab boardId={id ?? ""} boardType={board.type as BoardType} />
      ) : activeTab === "Chat" ? (
        <View style={styles.chatPlaceholder}>
          <Text style={styles.chatPlaceholderEmoji}>💬</Text>
          <Text style={styles.chatPlaceholderText}>Coming soon</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
          {/* TOP VOTED */}
          {approved.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top voted</Text>
              {approved.map((s, idx) => (
                <ProductCard
                  key={s.id}
                  suggestion={s}
                  isCreator={isCreator}
                  boardType={board.type}
                  index={idx}
                  boardId={id ?? ""}
                  onVote={() => voteMutation.mutate(s.id)}
                  onApprove={() => statusMutation.mutate({ suggestionId: s.id, status: "approved" })}
                  onDecline={() => statusMutation.mutate({ suggestionId: s.id, status: "declined" })}
                  onAddToChecklist={(title, suggId, link, description) => setPendingChecklist({ title, id: suggId, link: link ?? null, description: description ?? null })}
                  onAddToItinerary={(sugg) => setItinerarySuggestion(sugg)}
                  onAddLink={(url) => updateSuggestionUrl.mutate({ suggestionId: s.id, url })}
                />
              ))}
            </View>
          )}

          {/* PENDING APPROVAL */}
          {pending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending approval</Text>
              {pending.map((s, idx) => (
                <ProductCard
                  key={s.id}
                  suggestion={s}
                  isCreator={isCreator}
                  boardType={board.type}
                  index={approved.length + idx}
                  boardId={id ?? ""}
                  onVote={() => voteMutation.mutate(s.id)}
                  onApprove={() => statusMutation.mutate({ suggestionId: s.id, status: "approved" })}
                  onDecline={() => statusMutation.mutate({ suggestionId: s.id, status: "declined" })}
                  onAddToChecklist={(title, suggId, link, description) => setPendingChecklist({ title, id: suggId, link: link ?? null, description: description ?? null })}
                  onAddToItinerary={(sugg) => setItinerarySuggestion(sugg)}
                  onAddLink={(url) => updateSuggestionUrl.mutate({ suggestionId: s.id, url })}
                />
              ))}
            </View>
          )}

          {approved.length === 0 && pending.length === 0 && (
            <View style={styles.emptyFeed} testID="empty-feed">
              <Text style={styles.emptyTitle}>No suggestions yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to suggest something</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ADD LINK AFTER APPROVAL MODAL */}
      <Modal
        visible={pendingLinkApproval !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (pendingLinkApproval) proceedToChecklist(pendingLinkApproval);
        }}
        testID="add-link-approval-modal"
      >
        <Pressable
          style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }]}
          onPress={() => { if (pendingLinkApproval) proceedToChecklist(pendingLinkApproval); }}
        >
          <Pressable style={styles.modalCard} onPress={() => { /* prevent dismiss */ }}>
            <Text style={styles.modalTitle}>Add a link?</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              Want to add a booking or shopping link for this suggestion?
            </Text>
            <TextInput
              style={styles.linkApprovalInput}
              value={linkApprovalDraft}
              onChangeText={setLinkApprovalDraft}
              placeholder="Paste a URL (optional)"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="link-approval-input"
            />
            <Pressable
              style={[styles.modalYesBtn, !linkApprovalDraft.trim() && { opacity: 0.5 }]}
              disabled={!linkApprovalDraft.trim()}
              testID="link-approval-save"
              onPress={() => {
                if (pendingLinkApproval && linkApprovalDraft.trim()) {
                  updateSuggestionUrl.mutate(
                    { suggestionId: pendingLinkApproval.id, url: linkApprovalDraft.trim() },
                    { onSettled: () => proceedToChecklist(pendingLinkApproval, linkApprovalDraft.trim()) }
                  );
                }
              }}
            >
              <Text style={styles.modalYesBtnText}>Save link</Text>
            </Pressable>
            <Pressable
              style={styles.modalSkipBtn}
              testID="link-approval-skip"
              onPress={() => { if (pendingLinkApproval) proceedToChecklist(pendingLinkApproval); }}
            >
              <Text style={styles.modalSkipText}>Skip for now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ADD TO CHECKLIST MODAL */}
      <Modal
        visible={pendingChecklist !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingChecklist(null)}
        testID="checklist-prompt-modal"
      >
        <Pressable style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }]} onPress={() => setPendingChecklist(null)}>
          <Pressable style={styles.modalCard} onPress={() => {/* prevent dismiss */}}>
            <Text style={styles.modalTitle}>Add to checklist?</Text>
            {pendingChecklist ? (
              <Text style={styles.modalSubtitle} numberOfLines={2}>{pendingChecklist.title}</Text>
            ) : null}
            <Pressable
              style={styles.modalYesBtn}
              testID="checklist-prompt-yes"
              onPress={() => {
                if (pendingChecklist) {
                  createChecklistItem.mutate({
                    title: pendingChecklist.title,
                    suggestionId: pendingChecklist.id,
                    link: pendingChecklist.link ?? undefined,
                    description: pendingChecklist.description ?? undefined,
                  });
                }
                setPendingChecklist(null);
              }}
            >
              <Text style={styles.modalYesBtnText}>Yes, add it</Text>
            </Pressable>
            <Pressable
              onPress={() => setPendingChecklist(null)}
              style={styles.modalSkipBtn}
              testID="checklist-prompt-skip"
            >
              <Text style={styles.modalSkipText}>Skip</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ADD TO ITINERARY MODAL */}
      <AddToItineraryModal
        visible={itinerarySuggestion !== null}
        onClose={() => setItinerarySuggestion(null)}
        boardId={id ?? ""}
        suggestion={itinerarySuggestion}
      />

      {/* SUGGESTION SUBMITTED TOAST */}
      {toastVisible ? (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
          testID="suggestion-submitted-toast"
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      {/* INVITE BOTTOM SHEET */}
      <Modal
        visible={inviteSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteSheetVisible(false)}
        testID="invite-sheet-modal"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInviteSheetVisible(false)}>
          <Pressable style={styles.inviteSheet} onPress={() => { /* prevent dismiss */ }}>
            <View style={styles.inviteSheetHandle} />
            <Pressable
              style={styles.inviteSheetCloseBtn}
              onPress={() => setInviteSheetVisible(false)}
              testID="invite-sheet-close"
            >
              <Ionicons name="close" size={20} color="#888888" />
            </Pressable>
            <Text style={styles.inviteSheetTitle}>Invite to {board.name}</Text>

            {/* Share via native share sheet — PRIMARY method */}
            <Pressable
              style={styles.inviteShareRow}
              testID="invite-share-button"
              onPress={async () => {
                if (!board.inviteCode) return;
                const link = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/invite/${board.inviteCode}`;
                await Share.share({ message: `Join me on Plannr: ${link}`, url: link });
              }}
            >
              <View style={[styles.inviteLinkIconBox, { backgroundColor: config.bg }]}>
                <Ionicons name="share-outline" size={20} color={config.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteLinkText}>Share invite link</Text>
                <Text style={styles.inviteShareSub}>iMessage, WhatsApp, Instagram...</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
            </Pressable>

            {/* Copy invite link */}
            <Pressable
              style={styles.inviteLinkRow}
              testID="invite-copy-link"
              onPress={async () => {
                if (!board.inviteCode) return;
                const link = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/invite/${board.inviteCode}`;
                await Clipboard.setStringAsync(link);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
            >
              <View style={styles.inviteLinkIconBox}>
                <Ionicons name="link-outline" size={20} color="#1a1a1a" />
              </View>
              <Text style={styles.inviteLinkText}>
                {linkCopied ? "Link copied!" : "Copy invite link"}
              </Text>
              {linkCopied ? (
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              ) : null}
            </Pressable>

            <View style={styles.inviteDivider} />

            {/* Email invite — with pills */}
            <Text style={styles.inviteEmailLabel}>Invite by email</Text>
            <View style={styles.inviteEmailRow}>
              <TextInput
                style={styles.inviteEmailInput}
                placeholder="name@email.com"
                placeholderTextColor="#AAAAAA"
                value={inviteEmailInput}
                onChangeText={setInviteEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
                testID="invite-email-input"
                onSubmitEditing={() => {
                  const trimmed = inviteEmailInput.trim();
                  if (trimmed.includes("@") && !inviteEmails.includes(trimmed)) {
                    setInviteEmails((prev) => [...prev, trimmed]);
                    setInviteEmailInput("");
                  }
                }}
              />
              <Pressable
                style={[
                  styles.inviteAddBtn,
                  { backgroundColor: config.text },
                  !inviteEmailInput.trim().includes("@") && styles.inviteEmailSendBtnDisabled,
                ]}
                disabled={!inviteEmailInput.trim().includes("@")}
                testID="invite-email-add"
                onPress={() => {
                  const trimmed = inviteEmailInput.trim();
                  if (trimmed.includes("@") && !inviteEmails.includes(trimmed)) {
                    setInviteEmails((prev) => [...prev, trimmed]);
                    setInviteEmailInput("");
                  }
                }}
              >
                <Text style={styles.inviteEmailSendBtnText}>Add</Text>
              </Pressable>
            </View>

            {/* Email pills */}
            {inviteEmails.length > 0 ? (
              <View style={styles.invitePillsRow}>
                {inviteEmails.map((em) => (
                  <Pressable
                    key={em}
                    style={styles.invitePill}
                    onPress={() => setInviteEmails((prev) => prev.filter((e) => e !== em))}
                    testID={`invite-pill-${em}`}
                  >
                    <Text style={styles.invitePillText}>{em}</Text>
                    <Ionicons name="close-circle" size={14} color="#888888" style={{ marginLeft: 4 }} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Send all invites button */}
            {inviteEmails.length > 0 ? (
              <Pressable
                style={[
                  styles.inviteSendAllBtn,
                  { backgroundColor: config.text },
                  sendEmailInvites.isPending && styles.inviteEmailSendBtnDisabled,
                ]}
                disabled={sendEmailInvites.isPending}
                testID="invite-send-all"
                onPress={() => {
                  if (!id || inviteEmails.length === 0) return;
                  sendEmailInvites.mutate({ boardId: id, emails: inviteEmails }, {
                    onSuccess: () => {
                      setInviteSheetVisible(false);
                      setInviteEmails([]);
                      setInviteEmailInput("");
                      showToast(`Invite${inviteEmails.length > 1 ? "s" : ""} sent!`);
                    },
                    onError: () => {
                      showToast("Failed to send invites. Please try again.");
                    },
                  });
                }}
              >
                <Text style={styles.inviteEmailSendBtnText}>
                  {sendEmailInvites.isPending
                    ? "Sending..."
                    : `Send ${inviteEmails.length} invite${inviteEmails.length > 1 ? "s" : ""}`}
                </Text>
              </Pressable>
            ) : null}

            {sendEmailInvites.isError ? (
              <Text style={styles.inviteEmailError} testID="invite-email-error">
                Failed to send invites. Please try again.
              </Text>
            ) : null}

            <View style={{ height: 24 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Settings Menu Modal */}
      <Modal
        visible={showSettingsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <Pressable style={styles.settingsOverlay} onPress={() => setShowSettingsMenu(false)}>
          <Pressable style={styles.settingsMenu} onPress={() => {}}>
            <Text style={styles.settingsMenuTitle}>Board settings</Text>

            <Pressable
              style={styles.settingsMenuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                setEditNameValue(board.name);
                setShowEditName(true);
              }}
              testID="edit-board-name-btn"
            >
              <Text style={styles.settingsMenuItemText}>Edit board name</Text>
            </Pressable>

            <View style={styles.settingsMenuDivider} />

            <Pressable
              style={styles.settingsMenuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                setEditTypeValue(board.type);
                setShowEditType(true);
              }}
              testID="edit-board-type-btn"
            >
              <Text style={styles.settingsMenuItemText}>Edit board type</Text>
            </Pressable>

            <View style={styles.settingsMenuDivider} />

            <Pressable
              style={styles.settingsMenuItem}
              onPress={() => {
                setShowSettingsMenu(false);
                setShowDeleteConfirm(true);
              }}
              testID="delete-board-menu-btn"
            >
              <Text style={[styles.settingsMenuItemText, { color: "#DC2626" }]}>Delete board</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable style={styles.settingsOverlay} onPress={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.deleteConfirmCard} onPress={() => {}}>
            <Text style={styles.deleteConfirmTitle}>Delete "{board.name}"?</Text>
            <Text style={styles.deleteConfirmBody}>
              This will permanently remove all suggestions, checklist items, and itinerary. This cannot be undone.
            </Text>
            <View style={styles.deleteConfirmActions}>
              <Pressable
                style={styles.deleteCancelBtn}
                onPress={() => setShowDeleteConfirm(false)}
                testID="delete-board-cancel-btn"
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteConfirmBtn, (deleteBoardMutation.isPending || deleteBoardMutation.isSuccess) && { opacity: 0.6 }]}
                onPress={() => deleteBoardMutation.mutate()}
                disabled={deleteBoardMutation.isPending || deleteBoardMutation.isSuccess}
                testID="delete-board-confirm-btn"
              >
                <Text style={styles.deleteConfirmText}>
                  {deleteBoardMutation.isPending ? "Deleting\u2026" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditName(false)}
      >
        <Pressable style={styles.settingsOverlay} onPress={() => setShowEditName(false)}>
          <Pressable style={styles.editSheetCard} onPress={() => {}}>
            <Text style={styles.editSheetTitle}>Edit board name</Text>
            <TextInput
              style={styles.editSheetInput}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Board name"
              placeholderTextColor="#AAAAAA"
              autoFocus
              maxLength={100}
              testID="edit-name-input"
            />
            <View style={styles.deleteConfirmActions}>
              <Pressable
                style={styles.deleteCancelBtn}
                onPress={() => setShowEditName(false)}
                testID="edit-name-cancel-btn"
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteConfirmBtn,
                  { backgroundColor: "#1a1a1a" },
                  (updateBoardMutation.isPending || !editNameValue.trim()) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (editNameValue.trim()) updateBoardMutation.mutate({ name: editNameValue.trim() });
                }}
                disabled={updateBoardMutation.isPending || !editNameValue.trim()}
                testID="edit-name-save-btn"
              >
                <Text style={styles.deleteConfirmText}>
                  {updateBoardMutation.isPending ? "Saving\u2026" : "Save"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Type Modal */}
      <Modal
        visible={showEditType}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditType(false)}
      >
        <Pressable style={styles.settingsOverlay} onPress={() => setShowEditType(false)}>
          <Pressable style={styles.editSheetCard} onPress={() => {}}>
            <Text style={styles.editSheetTitle}>Edit board type</Text>
            <View style={styles.typeGrid}>
              {(Object.entries(BOARD_TYPE_CONFIG) as Array<[BoardType, typeof BOARD_TYPE_CONFIG[BoardType]]>).map(([type, config]) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeOption,
                    { backgroundColor: config.bg },
                    editTypeValue === type && styles.typeOptionSelected,
                  ]}
                  onPress={() => setEditTypeValue(type)}
                  testID={`type-option-${type.toLowerCase()}`}
                >
                  <Text style={styles.typeOptionEmoji}>{config.emoji}</Text>
                  <Text style={[styles.typeOptionLabel, { color: config.text }]} numberOfLines={2}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.deleteConfirmActions}>
              <Pressable
                style={styles.deleteCancelBtn}
                onPress={() => setShowEditType(false)}
                testID="edit-type-cancel-btn"
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteConfirmBtn,
                  { backgroundColor: "#1a1a1a" },
                  (updateBoardMutation.isPending || !editTypeValue) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (editTypeValue) updateBoardMutation.mutate({ type: editTypeValue });
                }}
                disabled={updateBoardMutation.isPending || !editTypeValue}
                testID="edit-type-save-btn"
              >
                <Text style={styles.deleteConfirmText}>
                  {updateBoardMutation.isPending ? "Saving\u2026" : "Save"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── ChecklistTab Styles ──────────────────────────────────────────────────────

const clStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  progressSection: {
    marginBottom: 16,
    gap: 8,
  },
  progressLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#1a1a1a",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#EBEBEB",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 6,
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#FFFFFF",
  },
  addBtn: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#BBBBBB",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 10,
    zIndex: 1,
    padding: 2,
  },
  deleteBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingRight: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginLeft: 34,
  },
  linkText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#2563EB",
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginLeft: 34,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  assigneeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
  },
  empty: {
    paddingTop: 48,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 18,
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
  },
  // Category section header
  catSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  catSectionHeaderText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  catSectionCount: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
  },
  catSectionDivider: {
    height: 1,
    borderRadius: 1,
    marginBottom: 10,
    opacity: 0.5,
  },
  // Category tag on item
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F5F5F5",
  },
  categoryTagText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#888888",
  },
  // Category picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  categorySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  categorySheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDDDDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  categorySheetTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 14,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryOptionActive: {
    // highlight handled via text color
  },
  categoryOptionText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#444444",
    flex: 1,
  },
  categoryOptionTextActive: {
    fontFamily: "DMSans_600SemiBold",
    color: "#1a1a1a",
  },
  categoryOptionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  // Inline title editing
  cardTitleInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    paddingVertical: 0,
    marginBottom: 2,
  },
  // Description
  descRow: {
    marginTop: 4,
    marginLeft: 34,
    marginRight: 20,
  },
  descText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
  },
  descPlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#CCCCCC",
    lineHeight: 18,
  },
  descInput: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    paddingVertical: 2,
    minHeight: 32,
  },
  // Link field
  linkFieldRow: {
    marginTop: 6,
    marginLeft: 34,
    marginRight: 20,
  },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  linkPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#2563EB",
  },
  addLinkText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#2563EB",
  },
  linkInput: {
    height: 32,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 6,
    paddingHorizontal: 8,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
  linkContextMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  linkContextOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  linkContextOptionText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
  },
  // Assignee
  assigneeBtn: {
    marginLeft: "auto" as any,
  },
  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  assigneeAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitial: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    color: "#888888",
  },
  assigneeName: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#888888",
    maxWidth: 80,
  },
  assigneePlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#BBBBBB",
  },
  assigneeAvatarLg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitialLg: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#555555",
  },
  // Per-category add item
  catAddBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  catAddBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#BBBBBB",
  },
  catAddRow: {
    marginTop: 4,
  },
  catAddInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
  emptyCategory: {
    marginBottom: 4,
  },
  catAddBtnEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  catAddBtnEmptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#CCCCCC",
  },
});

// ─── Itinerary Styles ─────────────────────────────────────────────────────────

const itStyles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#888888",
  },
  shareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  shareBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#888888",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 32,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  // Day section
  daySection: {
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayNumber: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#1a1a1a",
  },
  dayDate: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
  },
  itemCountBadge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemCountText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#666666",
  },
  dayDeleteBtn: {
    padding: 4,
  },
  dayDeleteText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  chevron: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#AAAAAA",
  },

  itemsList: {
    padding: 16,
  },
  noItemsText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    paddingVertical: 16,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    marginBottom: 0,
  },
  timeCol: {
    width: 52,
    alignItems: "flex-end",
    paddingRight: 8,
    paddingTop: 4,
  },
  timeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#888888",
  },
  lineCol: {
    width: 20,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    zIndex: 1,
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
    marginTop: 2,
    opacity: 0.35,
  },
  itemCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    marginLeft: 8,
  },
  itemDeleteBtn: {
    position: "absolute",
    top: 6,
    right: 8,
    zIndex: 1,
    padding: 2,
  },
  itemDeleteText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#CCCCCC",
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingRight: 20,
  },
  itemEmoji: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemTitle: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
    lineHeight: 20,
  },
  itemDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
    lineHeight: 16,
  },
  itemLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  itemLinkIcon: {
    fontSize: 11,
  },
  itemLink: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#2563EB",
    flex: 1,
  },
  itemLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  itemLocIcon: {
    fontSize: 11,
  },
  itemLoc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    flex: 1,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
  },
  editedByText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#BBBBBB",
  },

  addDayRow: {
    alignItems: "center",
    paddingVertical: 14,
  },
  addDayRowText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#888888",
  },

  // Bottom sheet / modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 16,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  dayPillActive: {
    backgroundColor: "#1a1a1a",
  },
  dayPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#666666",
  },
  dayPillTextActive: {
    color: "#FFFFFF",
  },
  addDayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CCCCCC",
    borderStyle: "dashed",
  },
  addDayPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#888888",
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  categoryPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#666666",
  },
  twoCol: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },

  // Inline time editing
  timeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
    marginLeft: 6,
  },
  timePlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#CCCCCC",
  },
  timeInput: {
    width: 72,
    height: 28,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 6,
    paddingHorizontal: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
    marginLeft: 6,
  },
  // Inline title editing
  itemTitleInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    paddingVertical: 0,
    flex: 1,
  },
  // Inner card layout
  itemCardInner: {
    flex: 1,
  },
  // Description
  descPlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#DDDDDD",
    marginTop: 4,
    lineHeight: 16,
  },
  descInput: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
    lineHeight: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    minHeight: 32,
    paddingVertical: 2,
  },
  // Link field
  linkFieldRow: {
    marginTop: 6,
  },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  linkPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#2563EB",
  },
  addLinkText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#2563EB",
  },
  linkInput: {
    height: 32,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 6,
    paddingHorizontal: 8,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
  linkContextMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  linkContextOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  linkContextText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
  },
  // Location
  locationPlaceholder: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#DDDDDD",
    marginTop: 4,
  },
  locationInput: {
    height: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
    paddingVertical: 2,
  },
  // Swipe to delete
  swipeDeleteBtn: {
    backgroundColor: "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    marginBottom: 12,
    marginLeft: 8,
    borderRadius: 10,
  },
  swipeDeleteText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  // Reorder controls
  reorderControls: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  reorderBtn: {
    padding: 4,
  },
  reorderBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#888888",
  },
  // Edit mode delete button inside card
  editModeDeleteBtn: {
    marginLeft: "auto" as any,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editModeDeleteText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#E53E3E",
  },
  // Category picker rows
  categoryOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryOptionRowActive: {
    // handled via text color
  },
  categoryOptionEmoji: {
    fontSize: 18,
  },
  categoryOptionLabel: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#444444",
  },
  categoryOptionCheck: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#1a1a1a",
  },
  // Edit mode toggle button
  editModeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  editModeToggleActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  editModeToggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#888888",
  },
  editModeToggleTextActive: {
    color: "#FFFFFF",
  },
  // Day label editing
  dayLabelInput: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
    paddingVertical: 0,
    minWidth: 80,
  },
  // Per-day add item
  addItemBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  addItemBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#BBBBBB",
  },
  addItemRow: {
    marginTop: 8,
  },
  addItemInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
  shareMissingSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    marginBottom: 14,
    lineHeight: 18,
  },
  shareMissingItem: {
    marginBottom: 12,
  },
  shareMissingItemTitle: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  shareMissingInput: {
    height: 38,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 18,
    color: "#1a1a1a",
    flex: 1,
    marginHorizontal: 12,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F0",
    alignItems: "center",
    justifyContent: "center",
  },

  boardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  invitePeopleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F7F7F7",
  },
  invitePeopleBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#444444",
  },
  metaText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCCCCC",
  },

  affiliateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  affiliateEmoji: { fontSize: 14 },
  affiliateText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },

  filterTabsRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 0,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "relative",
    alignItems: "center",
  },
  filterTabActive: {},
  filterTabText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#888888",
  },
  filterTabTextActive: { color: "#1a1a1a" },
  filterTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: "#1a1a1a",
  },

  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  chipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#666666",
  },
  chipTextActive: { color: "#FFFFFF" },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#888888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    marginBottom: 10,
  },
  productCardPending: {
    backgroundColor: "#FFFDF7",
    borderColor: "#FAC775",
  },
  productMain: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  thumbnailEmoji: { fontSize: 32 },
  productInfo: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  productName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 18,
  },
  productDescription: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    lineHeight: 16,
  },
  productSource: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#888888",
  },
  productPrice: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#1a1a1a",
  },

  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    backgroundColor: "#FFFFFF",
    marginTop: 2,
  },
  upvoteBtnActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  upvoteCount: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    color: "#1a1a1a",
  },
  upvoteCountActive: { color: "#FFFFFF" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F8F8F8",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerAuthor: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#888888",
    flex: 1,
  },
  itineraryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  itineraryBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#666666",
  },
  shopNow: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#2563EB",
  },

  pendingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFBF0",
    borderTopWidth: 1,
    borderTopColor: "#FAC775",
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  pendingFooterText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#854F0B",
    flex: 1,
    marginLeft: 6,
  },
  approvalBtns: {
    flexDirection: "row",
    gap: 6,
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
  },
  approveBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CCCCCC",
  },
  declineBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#888888",
  },

  emptyFeed: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    backgroundColor: "#FFFFFF",
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabBarLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#AAAAAA",
  },
  tabBarLabelActive: {
    color: "#1a1a1a",
  },
  tabBarUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: "#1a1a1a",
    borderRadius: 1,
  },

  // Chat placeholder
  chatPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatPlaceholderEmoji: {
    fontSize: 36,
  },
  chatPlaceholderText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
  },

  // Approved card footer secondary actions
  footerSecondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#C8C5C0",
    backgroundColor: "transparent",
  },
  secondaryActionBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#888888",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  modalTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  modalYesBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  modalYesBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  modalSkipBtn: {
    paddingVertical: 8,
  },
  modalSkipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
  },
  toast: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  toastText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ─── Invite Sheet ──────────────────────────────────────────────────────────
  inviteSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    width: "100%",
  },
  inviteSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDDDDD",
    alignSelf: "center",
    marginBottom: 18,
  },
  inviteSheetCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  inviteSheetTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 18,
    color: "#1a1a1a",
    marginBottom: 20,
  },
  inviteLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
    marginBottom: 4,
  },
  inviteLinkIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteLinkText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#1a1a1a",
    flex: 1,
  },
  inviteDivider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 18,
  },
  inviteEmailLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 10,
  },
  inviteEmailRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  inviteEmailInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#FFFFFF",
  },
  inviteEmailSendBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAddBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  invitePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  invitePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  invitePillText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#333333",
  },
  inviteSendAllBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  inviteShareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    marginBottom: 10,
  },
  inviteShareSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
  },
  inviteEmailSendBtnDisabled: {
    opacity: 0.4,
  },
  inviteEmailSendBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  inviteEmailSuccess: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#22C55E",
    marginTop: 8,
  },
  inviteEmailError: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#E02020",
    marginTop: 8,
  },
  inviteNoCode: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#AAAAAA",
    marginTop: 12,
    textAlign: "center",
  },
  addLinkNudge: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  addLinkNudgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#2563EB",
  },
  addLinkInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addLinkInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
  },
  linkApprovalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "#FAFAFA",
    marginVertical: 12,
  },

  // Settings menu modal
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  settingsMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  settingsMenuTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: "#AAAAAA",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingsMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingsMenuItemText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#1a1a1a",
  },
  settingsMenuItemHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
  },
  settingsMenuDivider: {
    height: 1,
    backgroundColor: "#F4F4F4",
    marginHorizontal: 16,
  },

  // Delete confirm modal
  deleteConfirmCard: {
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
  deleteConfirmTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
    marginBottom: 10,
  },
  deleteConfirmBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#666666",
    lineHeight: 21,
    marginBottom: 24,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 12,
  },
  deleteCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCancelText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#1a1a1a",
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  editSheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  editSheetTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 20,
    color: "#1a1a1a",
  },
  editSheetInput: {
    height: 52,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#1a1a1a",
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    width: "47%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeOptionSelected: {
    borderColor: "#1a1a1a",
  },
  typeOptionEmoji: {
    fontSize: 22,
  },
  typeOptionLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    flex: 1,
  },
});

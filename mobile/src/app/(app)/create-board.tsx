import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import { api } from "@/lib/api/api";
import { BOARD_TYPE_CONFIG, BOARD_TYPES, BoardType } from "@/lib/theme";

const AVATAR_COLORS = [
  { bg: "#FAEEDA", text: "#854F0B" },
  { bg: "#EAF3DE", text: "#3B6D11" },
  { bg: "#FBEAF0", text: "#993556" },
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#EEEDFE", text: "#534AB7" },
];

function detectBoardType(name: string): BoardType | null {
  const lower = name.toLowerCase();
  if (lower.includes("bachelor") || lower.includes("bachelorette")) return "BACHELOR";
  if (lower.includes("wedding")) return "WEDDING";
  if (lower.includes("engagement") || lower.includes("engaged")) return "ENGAGEMENT";
  if (lower.includes("birthday")) return "BIRTHDAY";
  if (lower.includes("moving") || lower.includes("apartment") || lower.includes("new home")) return "MOVING";
  if (lower.includes("housewarming") || lower.includes("house warming")) return "HOUSEWARMING";
  if (lower.includes("trip") || lower.includes("travel") || lower.includes("vacation")) return "GROUP_TRIP";
  if (lower.includes("baby") || lower.includes("shower")) return "BABY_SHOWER";
  return null;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/[\s@.]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

interface ProgressDotsProps {
  step: number;
}

function ProgressDots({ step }: ProgressDotsProps) {
  return (
    <View style={styles.progressRow}>
      {[0, 1, 2].map((i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: isActive ? 20 : 6,
                backgroundColor: isDone || isActive ? "#1a1a1a" : "#DEDEDE",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function CreateBoardScreen() {
  const [step, setStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [selectedType, setSelectedType] = useState<BoardType | null>(null);
  const [detectedType, setDetectedType] = useState<BoardType | null>(null);
  const [showTypeChips, setShowTypeChips] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [inviteInput, setInviteInput] = useState<string>("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.length >= 2) {
      const detected = detectBoardType(text);
      setDetectedType(detected);
    } else {
      setDetectedType(null);
    }
  };

  const handleAddInvitee = () => {
    const trimmed = inviteInput.trim();
    if (trimmed && !invitees.includes(trimmed)) {
      setInvitees((prev) => [...prev, trimmed]);
    }
    setInviteInput("");
  };

  const handleRemoveInvitee = (item: string) => {
    setInvitees((prev) => prev.filter((i) => i !== item));
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedType) return;
    setError(null);
    setLoading(true);
    try {
      await api.post<any>("/api/boards", {
        name: name.trim(),
        type: selectedType,
        eventDate: eventDate ? eventDate.toISOString() : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep(step - 1);
    }
  };

  const canContinueStep0 = name.trim().length >= 2 && selectedType !== null;

  const detectedConfig = detectedType ? BOARD_TYPE_CONFIG[detectedType] : null;

  return (
    <SafeAreaView style={styles.container} testID="create-board-screen">
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerBtn} testID="back-button">
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>New board</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress dots */}
      <ProgressDots step={step} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0 */}
        {step === 0 ? (
          <Animated.View
            key="step-0"
            entering={FadeInRight.duration(250)}
            exiting={FadeOutLeft.duration(200)}
            style={styles.stepContainer}
            testID="step-0"
          >
            <Text style={styles.stepTitle}>What are you{"\n"}planning?</Text>
            <Text style={styles.stepSubtitle}>Give your board a name</Text>

            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Miami Bachelor Trip"
              placeholderTextColor="#CCCCCC"
              autoFocus
              autoCapitalize="words"
              testID="board-name-input"
            />

            {/* AI Detection Banner */}
            {detectedType && detectedConfig && !showTypeChips ? (
              <Animated.View
                entering={FadeInDown.duration(300).springify()}
                style={[styles.detectionBanner, { backgroundColor: detectedConfig.bg }]}
                testID="detection-banner"
              >
                <View style={styles.bannerRow}>
                  <View style={styles.bannerLeft}>
                    <Text style={styles.bannerEmoji}>{detectedConfig.emoji}</Text>
                    <Text style={[styles.bannerLabel, { color: detectedConfig.text }]}>
                      Looks like a {detectedConfig.label} board
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedType(detectedType);
                      setStep(1);
                    }}
                    style={styles.yesPill}
                    testID="yes-type-button"
                  >
                    <Text style={styles.yesPillText}>Yes, that's right →</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setShowTypeChips(true)}
                  testID="change-type-button"
                >
                  <Text style={styles.changeTypeText}>Change type</Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* Type chips (shown when change type is tapped or no detection) */}
            {(showTypeChips || (name.length >= 2 && !detectedType)) ? (
              <Animated.View
                entering={FadeInDown.duration(250)}
                testID="type-chips-container"
              >
                <Text style={styles.pickTypeLabel}>Pick a type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={styles.typeChipsRow}
                >
                  {BOARD_TYPES.map((type) => {
                    const config = BOARD_TYPE_CONFIG[type];
                    const isSelected = selectedType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          setSelectedType(type);
                          setDetectedType(type);
                          setShowTypeChips(false);
                          setStep(1);
                        }}
                        style={[
                          styles.typeChip,
                          { backgroundColor: isSelected ? config.bg : "#F5F5F5" },
                          isSelected ? { borderColor: config.text, borderWidth: 1.5 } : null,
                        ]}
                        testID={`type-chip-${type}`}
                      >
                        <Text style={styles.typeChipEmoji}>{config.emoji}</Text>
                        <Text style={[styles.typeChipText, { color: isSelected ? config.text : "#666666" }]}>
                          {config.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            ) : null}

            {canContinueStep0 ? (
              <Pressable
                onPress={() => setStep(1)}
                style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.8 }]}
                testID="continue-step-0"
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Step 1 */}
        {step === 1 ? (
          <Animated.View
            key="step-1"
            entering={FadeInRight.duration(250)}
            exiting={FadeOutLeft.duration(200)}
            style={styles.stepContainer}
            testID="step-1"
          >
            <Text style={styles.stepTitle}>When is it?</Text>
            <Text style={styles.stepSubtitle}>Set a date so members know when to plan</Text>

            <Pressable
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              testID="event-date-picker-button"
            >
              <Text style={[styles.datePickerText, !eventDate && styles.datePickerPlaceholder]}>
                {eventDate
                  ? eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "Select a date"}
              </Text>
            </Pressable>

            {(showDatePicker || Platform.OS === "ios") ? (
              <DateTimePicker
                value={eventDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(_: DateTimePickerEvent, selected?: Date) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (selected) setEventDate(selected);
                }}
                testID="event-date-picker"
              />
            ) : null}

            <Pressable
              onPress={() => setStep(2)}
              style={styles.notSureButton}
              testID="not-sure-button"
            >
              <Text style={styles.notSureText}>Not sure yet</Text>
            </Pressable>

            {eventDate !== null ? (
              <Pressable
                onPress={() => setStep(2)}
                style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.8 }]}
                testID="continue-step-1"
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        {/* Step 2 */}
        {step === 2 ? (
          <Animated.View
            key="step-2"
            entering={FadeInRight.duration(250)}
            exiting={FadeOutLeft.duration(200)}
            style={styles.stepContainer}
            testID="step-2"
          >
            <Text style={styles.stepTitle}>Invite your crew</Text>
            <Text style={styles.stepSubtitle}>Add members by email or phone</Text>

            {/* Invite input row */}
            <View style={styles.inviteRow}>
              <TextInput
                style={styles.inviteInput}
                value={inviteInput}
                onChangeText={setInviteInput}
                placeholder="Email or phone number"
                placeholderTextColor="#CCCCCC"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleAddInvitee}
                testID="invite-input"
              />
              <Pressable
                onPress={handleAddInvitee}
                style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
                testID="add-invitee-button"
              >
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            {/* Invitees list */}
            {invitees.length > 0 ? (
              <View style={styles.inviteesList}>
                {invitees.map((item, index) => {
                  const colorSet = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const initials = getInitials(item);
                  const displayName = item.length > 22 ? item.slice(0, 22) + "…" : item;
                  return (
                    <View key={item} style={styles.inviteePill} testID={`invitee-pill-${index}`}>
                      <View style={[styles.inviteeAvatar, { backgroundColor: colorSet.bg }]}>
                        <Text style={[styles.inviteeInitials, { color: colorSet.text }]}>
                          {initials}
                        </Text>
                      </View>
                      <Text style={styles.inviteeName} numberOfLines={1}>{displayName}</Text>
                      <Pressable
                        onPress={() => handleRemoveInvitee(item)}
                        style={styles.removeButton}
                        testID={`remove-invitee-${index}`}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Share invite link */}
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.shareLinkButton, pressed && { opacity: 0.7 }]}
              testID="share-invite-link"
            >
              <Text style={styles.shareLinkIcon}>🔗</Text>
              <Text style={styles.shareLinkText}>Share invite link</Text>
            </Pressable>

            {error ? (
              <Text style={styles.errorText} testID="error-message">{error}</Text>
            ) : null}

            {/* Create board button */}
            <Pressable
              onPress={handleCreate}
              disabled={loading}
              style={({ pressed }) => [
                styles.createButton,
                pressed && { opacity: 0.8 },
                loading && { opacity: 0.6 },
              ]}
              testID="create-board-button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" testID="loading-indicator" />
              ) : (
                <Text style={styles.createButtonText}>Create board</Text>
              )}
            </Pressable>
          </Animated.View>
        ) : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#1a1a1a",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  stepTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 28,
    color: "#1a1a1a",
    lineHeight: 36,
  },
  stepSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#888888",
    marginTop: -8,
  },
  nameInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    borderRadius: 16,
    padding: 18,
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#1a1a1a",
  },
  detectionBanner: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  bannerEmoji: {
    fontSize: 18,
  },
  bannerLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    flex: 1,
    flexWrap: "wrap",
  },
  yesPill: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yesPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
  },
  changeTypeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    textDecorationLine: "underline",
  },
  pickTypeLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#888888",
    marginBottom: 8,
  },
  typeChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 24,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
  },
  typeChipEmoji: {
    fontSize: 16,
  },
  typeChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  continueButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  continueButtonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  datePickerButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    borderRadius: 16,
    padding: 18,
    justifyContent: "center",
  },
  datePickerText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#1a1a1a",
  },
  datePickerPlaceholder: {
    color: "#CCCCCC",
  },
  notSureButton: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  notSureText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#888888",
    textDecorationLine: "underline",
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#1a1a1a",
    paddingVertical: 6,
  },
  addButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  inviteesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inviteePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    maxWidth: "100%",
  },
  inviteeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteeInitials: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  inviteeName: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#1a1a1a",
    maxWidth: 140,
  },
  removeButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#888888",
    lineHeight: 20,
  },
  shareLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  shareLinkIcon: {
    fontSize: 16,
  },
  shareLinkText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#1a1a1a",
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#E53E3E",
  },
  createButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createButtonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

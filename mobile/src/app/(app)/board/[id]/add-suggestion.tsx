import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api } from "@/lib/api/api";
import type { BoardDetail } from "@/lib/types";
import { markSuggestionSubmitted } from "@/lib/suggestion-submitted-signal";

// ─── URL helpers ─────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace("www.", "").split("/")[0];
  } catch {
    // fallback: strip https://, www., take up to first slash
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function isLikelyUrl(text: string): boolean {
  return text.includes(".") && !text.includes(" ") && text.length > 3;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddSuggestionScreen() {
  const { id: boardId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Keep board data reference (used by existing mutation pattern)
  queryClient.getQueryData<BoardDetail>(["board", boardId]);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const showLinkPreview = link.trim().length > 0 && isLikelyUrl(link.trim());
  const linkDomain = showLinkPreview ? extractDomain(link.trim()) : "";

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/boards/${boardId}/suggestions`, {
        title: title.trim(),
        description: description.trim() || undefined,
        url: link.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      markSuggestionSubmitted();
      router.replace(`/board/${boardId}` as any);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Failed to add suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="add-suggestion-screen">
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.replace(`/board/${boardId}` as any)}
          style={styles.backBtn}
          testID="back-button"
        >
          <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2} />
        </Pressable>
        <Text style={styles.topBarTitle}>Add a suggestion</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>What do you want to suggest?</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Rooftop dinner, beach day, airbnb in Miami..."
            placeholderTextColor="#AAAAAA"
            returnKeyType="next"
            testID="title-input"
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Why is this a good idea?</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add more details, why you think this is a good pick..."
            placeholderTextColor="#AAAAAA"
            multiline
            textAlignVertical="top"
            testID="description-input"
          />
        </View>

        {/* Link */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabelSecondary}>Link (optional)</Text>
          <TextInput
            style={styles.textInput}
            value={link}
            onChangeText={setLink}
            placeholder="https:// product or booking link (optional)"
            placeholderTextColor="#AAAAAA"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            testID="link-input"
          />
          {showLinkPreview ? (
            <View style={styles.linkPreviewPill} testID="link-preview-pill">
              <Text style={styles.linkPreviewIcon}>🔗</Text>
              <Text style={styles.linkPreviewText} numberOfLines={1}>
                {linkDomain}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Error */}
        {error !== null ? (
          <Text style={styles.errorText} testID="submit-error">
            {error}
          </Text>
        ) : null}

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="submit-button"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Send suggestion</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
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
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
    color: "#1a1a1a",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  fieldGroup: {
    gap: 0,
  },
  fieldLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
  },
  fieldLabelSecondary: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#1a1a1a",
  },
  textInputMultiline: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  linkPreviewPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 28,
    marginTop: 8,
    gap: 4,
  },
  linkPreviewIcon: {
    fontSize: 12,
  },
  linkPreviewText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#2563EB",
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#E53E3E",
  },
  submitBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

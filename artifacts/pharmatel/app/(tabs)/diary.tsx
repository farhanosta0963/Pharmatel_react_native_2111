import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import type { DiaryEntry } from "@/models";
import { getMetricDef, MOOD_LABELS } from "@/services/diaryMetrics";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function buildShareText(entries: DiaryEntry[], patientName: string): string {
  if (entries.length === 0) return "No diary entries to share.";
  let text = `Health Diary — ${patientName}\n`;
  text += `Exported: ${new Date().toLocaleDateString("en-US", { dateStyle: "full" })}\n`;
  text += "─".repeat(40) + "\n\n";

  const grouped = groupByDate(entries);
  for (const [date, dayEntries] of grouped) {
    text += `📅 ${formatDate(date)}\n`;
    for (const entry of dayEntries) {
      text += `  ⏰ ${entry.time}\n`;
      if (entry.mood) {
        const m = MOOD_LABELS[entry.mood];
        text += `  Mood: ${m.emoji} ${m.label}\n`;
      }
      for (const metric of entry.metrics) {
        text += `  ${metric.label}: ${metric.value}${metric.unit ? " " + metric.unit : ""}\n`;
      }
      if (entry.generalNotes) {
        text += `  Notes: ${entry.generalNotes}\n`;
      }
      text += "\n";
    }
  }
  return text;
}

function groupByDate(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

function MetricPill({
  metric,
  colors,
}: {
  metric: DiaryEntry["metrics"][number];
  colors: (typeof Colors)["light"];
}) {
  const def = getMetricDef(metric.type);
  const color = def?.color ?? colors.primary;
  return (
    <View style={[styles.metricPill, { backgroundColor: color + "18", borderColor: color + "30" }]}>
      <Feather name={metric.icon as any} size={12} color={color} />
      <Text style={[styles.metricValue, { color }]}>
        {metric.value}{metric.unit ? ` ${metric.unit}` : ""}
      </Text>
    </View>
  );
}

function EntryCard({
  entry,
  colors,
  onEdit,
  onDelete,
}: {
  entry: DiaryEntry;
  colors: (typeof Colors)["light"];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const mood = entry.mood ? MOOD_LABELS[entry.mood] : null;

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.entryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.93 : 1,
        },
      ]}
    >
      {/* Time + mood row */}
      <View style={styles.entryHeader}>
        <View style={styles.entryTimeRow}>
          <View style={[styles.timeChip, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="clock" size={11} color={colors.primary} />
            <Text style={[styles.timeText, { color: colors.primary }]}>{entry.time}</Text>
          </View>
          {mood && (
            <View style={[styles.moodChip, { backgroundColor: mood.color + "18" }]}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="trash-2" size={15} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Metrics pills */}
      {entry.metrics.length > 0 && (
        <View style={styles.metricsRow}>
          {entry.metrics.map((m) => (
            <MetricPill key={m.id} metric={m} colors={colors} />
          ))}
        </View>
      )}

      {/* Notes */}
      {entry.generalNotes ? (
        <View style={[styles.notesBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Feather name="edit-3" size={12} color={colors.textMuted} />
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            {entry.generalNotes}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type GroupedItem =
  | { type: "header"; date: string; key: string }
  | { type: "entry"; entry: DiaryEntry; key: string };

export default function DiaryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { diaryEntries, removeDiaryEntry, patient } = useApp();
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [isSharing, setIsSharing] = useState(false);

  const listData = useMemo<GroupedItem[]>(() => {
    const sorted = [...diaryEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const items: GroupedItem[] = [];
    let lastDate = "";
    for (const entry of sorted) {
      if (entry.date !== lastDate) {
        items.push({ type: "header", date: entry.date, key: `hdr-${entry.date}` });
        lastDate = entry.date;
      }
      items.push({ type: "entry", entry, key: entry.id });
    }
    return items;
  }, [diaryEntries]);

  // Today stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntries = diaryEntries.filter((e) => e.date === todayStr);
  const todayMetrics = todayEntries.flatMap((e) => e.metrics);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const text = buildShareText(diaryEntries, patient?.name ?? "Patient");
      await Share.share({ message: text, title: "Health Diary" });
    } catch (_) {
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = (entryId: string) => {
    Alert.alert("Delete Entry", "Remove this diary entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeDiaryEntry(entryId),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Health Diary</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Track your daily health & vitals
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            disabled={isSharing || diaryEntries.length === 0}
            style={({ pressed }) => [
              styles.shareBtn,
              {
                backgroundColor: colors.primary + "15",
                borderColor: colors.primary + "30",
                opacity: pressed || diaryEntries.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="share-2" size={16} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share</Text>
          </Pressable>
        </View>

        {/* Today summary strip */}
        {todayMetrics.length > 0 && (
          <View style={styles.todayStrip}>
            <Text style={[styles.todayLabel, { color: colors.textMuted }]}>Today</Text>
            <FlatList
              horizontal
              data={todayMetrics.slice(0, 6)}
              keyExtractor={(m) => m.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
              renderItem={({ item }) => <MetricPill metric={item} colors={colors} />}
            />
          </View>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="book-open" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Your diary is empty
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Start logging your vitals, symptoms, and how you feel each day. Your doctor can use this to better understand your condition.
            </Text>
            <Pressable
              onPress={() => router.push("/diary/new")}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Add First Entry</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={styles.dateHeader}>
                <Text style={[styles.dateHeaderText, { color: colors.text }]}>
                  {formatDate(item.date)}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: colors.borderLight }]} />
              </View>
            );
          }
          return (
            <EntryCard
              entry={item.entry}
              colors={colors}
              onEdit={() =>
                router.push({ pathname: "/diary/new", params: { entryId: item.entry.id } })
              }
              onDelete={() => handleDelete(item.entry.id)}
            />
          );
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/diary/new")}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
          { bottom: insets.bottom + 90 },
        ]}
      >
        <Feather name="plus" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  shareBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  todayStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  todayLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 140,
    gap: 2,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  entryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  moodEmoji: { fontSize: 13 },
  moodLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    padding: 36,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginTop: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
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

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      if (entry.generalNotes) text += `  Notes: ${entry.generalNotes}\n`;
      text += "\n";
    }
  }
  return text;
}

/* ─── vitals header card ─────────────────────────────────────────────────── */

function VitalsCard({
  label,
  value,
  unit,
  icon,
  color,
  colors,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  color: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View
      style={[
        vStyles.vCard,
        { backgroundColor: colors.surface, borderColor: color + "25", shadowColor: color },
      ]}
    >
      <View style={[vStyles.vIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={[vStyles.vValue, { color: colors.text }]}>
        {value}
        <Text style={[vStyles.vUnit, { color: color }]}> {unit}</Text>
      </Text>
      <Text style={[vStyles.vLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const vStyles = StyleSheet.create({
  vCard: {
    width: 90,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  vIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  vValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  vUnit: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  vLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 13,
  },
});

/* ─── timeline entry card ────────────────────────────────────────────────── */

function MetricChip({
  metric,
  colors,
}: {
  metric: DiaryEntry["metrics"][number];
  colors: (typeof Colors)["light"];
}) {
  const def = getMetricDef(metric.type);
  const color = def?.color ?? colors.primary;
  return (
    <View
      style={[
        tlStyles.chip,
        { backgroundColor: color + "12", borderColor: color + "28" },
      ]}
    >
      <Feather name={metric.icon as any} size={11} color={color} />
      <Text style={[tlStyles.chipValue, { color }]}>
        {metric.value}
        {metric.unit ? (
          <Text style={[tlStyles.chipUnit, { color: color + "BB" }]}> {metric.unit}</Text>
        ) : null}
      </Text>
      <Text style={[tlStyles.chipLabel, { color: colors.textMuted }]}>{metric.label}</Text>
    </View>
  );
}

function TimelineEntry({
  entry,
  isFirst,
  isLast,
  isLastOfDay,
  colors,
  onEdit,
  onDelete,
}: {
  entry: DiaryEntry;
  isFirst: boolean;
  isLast: boolean;
  isLastOfDay: boolean;
  colors: (typeof Colors)["light"];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const mood = entry.mood ? MOOD_LABELS[entry.mood] : null;
  const accentColor = mood ? mood.color : colors.primary;

  return (
    <View style={tlStyles.row}>
      {/* ── timeline rail ── */}
      <View style={tlStyles.rail}>
        {/* top connector line */}
        <View
          style={[
            tlStyles.lineTop,
            {
              backgroundColor: isFirst ? "transparent" : colors.borderLight,
            },
          ]}
        />
        {/* dot */}
        <View style={[tlStyles.dotOuter, { borderColor: accentColor + "50", backgroundColor: accentColor + "12" }]}>
          <View style={[tlStyles.dotInner, { backgroundColor: accentColor }]} />
        </View>
        {/* bottom connector line */}
        <View
          style={[
            tlStyles.lineBottom,
            {
              backgroundColor: isLast ? "transparent" : colors.borderLight,
            },
          ]}
        />
      </View>

      {/* ── entry card ── */}
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          tlStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.cardShadow,
            opacity: pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        {/* mood accent bar */}
        <View style={[tlStyles.accentBar, { backgroundColor: accentColor }]} />

        <View style={tlStyles.cardInner}>
          {/* header row */}
          <View style={tlStyles.cardHeader}>
            <View style={tlStyles.cardHeaderLeft}>
              <Text style={[tlStyles.timeText, { color: accentColor }]}>{entry.time}</Text>
              {mood && (
                <View style={[tlStyles.moodPill, { backgroundColor: mood.color + "15" }]}>
                  <Text style={tlStyles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[tlStyles.moodText, { color: mood.color }]}>{mood.label}</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={onDelete}
              hitSlop={14}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 0.7 })}
            >
              <Feather name="trash-2" size={14} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* metrics grid */}
          {entry.metrics.length > 0 && (
            <View style={tlStyles.metricsWrap}>
              {entry.metrics.map((m) => (
                <MetricChip key={m.id} metric={m} colors={colors} />
              ))}
            </View>
          )}

          {/* notes */}
          {entry.generalNotes ? (
            <View style={[tlStyles.notesRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="file-text" size={12} color={colors.textMuted} />
              <Text style={[tlStyles.notesText, { color: colors.textSecondary }]} numberOfLines={3}>
                {entry.generalNotes}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

/* ─── date section header ────────────────────────────────────────────────── */

function DateSectionHeader({
  date,
  count,
  isFirst,
  colors,
}: {
  date: string;
  count: number;
  isFirst: boolean;
  colors: (typeof Colors)["light"];
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  return (
    <View style={[dhStyles.wrap, { marginTop: isFirst ? 0 : 24 }]}>
      {/* left line stub */}
      <View style={[dhStyles.lineBefore, { backgroundColor: isFirst ? "transparent" : colors.borderLight }]} />

      {/* date pill */}
      <View style={[dhStyles.pill, { backgroundColor: isToday ? colors.primary : colors.surfaceSecondary, borderColor: isToday ? colors.primary : colors.border }]}>
        <Feather name="calendar" size={12} color={isToday ? "#fff" : colors.textSecondary} />
        <Text style={[dhStyles.pillText, { color: isToday ? "#fff" : colors.text }]}>
          {formatDate(date)}
        </Text>
        <View style={[dhStyles.countBadge, { backgroundColor: isToday ? "rgba(255,255,255,0.25)" : colors.primary + "18" }]}>
          <Text style={[dhStyles.countText, { color: isToday ? "#fff" : colors.primary }]}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

const dhStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 20,
  },
  lineBefore: {
    width: 2,
    height: 24,
    borderRadius: 1,
    position: "absolute",
    left: 29,
    top: -24,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});

const tlStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 10,
  },
  rail: {
    width: 22,
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  lineTop: {
    width: 2,
    flex: 1,
    minHeight: 12,
    borderRadius: 1,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineBottom: {
    width: 2,
    flex: 1,
    minHeight: 12,
    borderRadius: 1,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    height: 3,
    width: "100%",
    borderRadius: 0,
  },
  cardInner: {
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  moodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  moodEmoji: { fontSize: 14 },
  moodText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  metricsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  chipUnit: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  chipLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  notesRow: {
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
    fontStyle: "italic",
  },
});

/* ─── list item types ─────────────────────────────────────────────────────── */

type ListItem =
  | { type: "sectionHeader"; date: string; count: number; key: string; isFirst: boolean }
  | {
      type: "entry";
      entry: DiaryEntry;
      key: string;
      isFirstOfDay: boolean;
      isLastOfDay: boolean;
      isAbsFirst: boolean;
      isAbsLast: boolean;
    };

/* ─── main screen ─────────────────────────────────────────────────────────── */

export default function DiaryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { diaryEntries, removeDiaryEntry, patient } = useApp();
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [isSharing, setIsSharing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── build flat list data ──
  const listData = useMemo<ListItem[]>(() => {
    const sorted = [...diaryEntries].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.time.localeCompare(a.time);
    });

    const items: ListItem[] = [];
    let lastDate = "";
    let dateFirstIdx = 0;
    let firstSection = true;
    const entryItems: ListItem[] = [];
    const dateGroups: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (entry.date !== lastDate) {
        dateGroups.push(entry.date);
        lastDate = entry.date;
      }
    }

    lastDate = "";
    let sectionIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isFirst = i === 0;
      const isLast = i === sorted.length - 1;

      if (entry.date !== lastDate) {
        const dayCount = sorted.filter((e) => e.date === entry.date).length;
        items.push({
          type: "sectionHeader",
          date: entry.date,
          count: dayCount,
          key: `hdr-${entry.date}`,
          isFirst: sectionIdx === 0,
        });
        sectionIdx++;
        lastDate = entry.date;
      }

      const sameDayEntries = sorted.filter((e) => e.date === entry.date);
      const idxInDay = sameDayEntries.findIndex((e) => e.id === entry.id);

      items.push({
        type: "entry",
        entry,
        key: entry.id,
        isFirstOfDay: idxInDay === 0,
        isLastOfDay: idxInDay === sameDayEntries.length - 1,
        isAbsFirst: isFirst,
        isAbsLast: isLast,
      });
    }
    return items;
  }, [diaryEntries]);

  // ── today vitals strip ──
  const todayMetrics = useMemo(
    () => diaryEntries.filter((e) => e.date === todayStr).flatMap((e) => e.metrics),
    [diaryEntries, todayStr]
  );
  const todayCount = diaryEntries.filter((e) => e.date === todayStr).length;

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
      { text: "Delete", style: "destructive", onPress: () => removeDiaryEntry(entryId) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero header ── */}
      <View style={[styles.hero, { paddingTop: topPadding, backgroundColor: colors.primary }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Health Diary</Text>
            <Text style={styles.heroSub}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            disabled={isSharing || diaryEntries.length === 0}
            style={({ pressed }) => [
              styles.heroShareBtn,
              { opacity: pressed || diaryEntries.length === 0 ? 0.45 : 1 },
            ]}
          >
            <Feather name="share-2" size={15} color="#fff" />
            <Text style={styles.heroShareText}>Export</Text>
          </Pressable>
        </View>

        {/* stats row */}
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{diaryEntries.length}</Text>
            <Text style={styles.heroStatLabel}>Total entries</Text>
          </View>
          <View style={[styles.heroStatDivider]} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{todayCount}</Text>
            <Text style={styles.heroStatLabel}>Today</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNum}>{new Set(diaryEntries.map((e) => e.date)).size}</Text>
            <Text style={styles.heroStatLabel}>Days logged</Text>
          </View>
        </View>
      </View>

      {/* ── today vitals strip ── */}
      {todayMetrics.length > 0 && (
        <View style={[styles.vitalsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.vitalsLabel, { color: colors.textMuted }]}>Today's vitals</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vitalsScroll}
          >
            {todayMetrics.slice(0, 8).map((m) => {
              const def = getMetricDef(m.type);
              return (
                <VitalsCard
                  key={m.id}
                  label={m.label}
                  value={m.value}
                  unit={m.unit}
                  icon={m.icon}
                  color={def?.color ?? colors.primary}
                  colors={colors}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── timeline list ── */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCircle, { backgroundColor: colors.primary + "12" }]}>
              <Feather name="book-open" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start your health diary</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Log your temperature, heart rate, weight, mood and more. Your doctor can review your history to better understand your condition.
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
          if (item.type === "sectionHeader") {
            return (
              <DateSectionHeader
                date={item.date}
                count={item.count}
                isFirst={item.isFirst}
                colors={colors}
              />
            );
          }
          return (
            <TimelineEntry
              entry={item.entry}
              isFirst={item.isAbsFirst}
              isLast={item.isAbsLast}
              isLastOfDay={item.isLastOfDay}
              colors={colors}
              onEdit={() =>
                router.push({ pathname: "/diary/new", params: { entryId: item.entry.id } })
              }
              onDelete={() => handleDelete(item.entry.id)}
            />
          );
        }}
      />

      {/* ── FAB ── */}
      <Pressable
        onPress={() => router.push("/diary/new")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 90,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  heroShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroShareText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  heroStatNum: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },

  // vitals
  vitalsBar: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  vitalsLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
  },
  vitalsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },

  // list
  listContent: {
    paddingTop: 20,
    gap: 0,
  },

  // empty
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 14,
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
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
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },

  // fab
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A7EA4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});

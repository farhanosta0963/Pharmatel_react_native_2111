import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import type { DiaryEntry, DiaryMetric } from "@/models";
import { METRIC_DEFINITIONS, MOOD_LABELS, getMetricDef } from "@/services/diaryMetrics";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

interface MetricInputProps {
  metric: DiaryMetric;
  onChangeValue: (id: string, value: string | number) => void;
  onRemove: (id: string) => void;
  colors: (typeof Colors)["light"];
}

function MetricInput({ metric, onChangeValue, onRemove, colors }: MetricInputProps) {
  const def = getMetricDef(metric.type);
  const color = def?.color ?? colors.primary;

  if (def?.inputType === "scale" && def.min !== undefined && def.max !== undefined) {
    const current = typeof metric.value === "number" ? metric.value : def.min;
    const steps = Array.from({ length: def.max - def.min + 1 }, (_, i) => i + def.min!);
    return (
      <View style={[styles.metricBlock, { borderColor: color + "30", backgroundColor: color + "08" }]}>
        <View style={styles.metricBlockHeader}>
          <View style={styles.metricBlockTitle}>
            <Feather name={metric.icon as any} size={16} color={color} />
            <Text style={[styles.metricBlockLabel, { color: colors.text }]}>{metric.label}</Text>
            <Text style={[styles.metricBlockUnit, { color: colors.textMuted }]}>{metric.unit}</Text>
          </View>
          <Pressable onPress={() => onRemove(metric.id)} hitSlop={10}>
            <Feather name="x" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scaleRow}>
          {steps.map((step) => (
            <Pressable
              key={step}
              onPress={() => onChangeValue(metric.id, step)}
              style={[
                styles.scaleStep,
                {
                  backgroundColor: current === step ? color : colors.surfaceSecondary,
                  borderColor: current === step ? color : colors.border,
                },
              ]}
            >
              <Text style={[styles.scaleStepText, { color: current === step ? "#fff" : colors.text }]}>
                {step}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[styles.scaleHint, { color: colors.textMuted }]}>
          {def.min} = no pain · {def.max} = worst pain
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.metricBlock, { borderColor: color + "30", backgroundColor: color + "08" }]}>
      <View style={styles.metricBlockHeader}>
        <View style={styles.metricBlockTitle}>
          <Feather name={metric.icon as any} size={16} color={color} />
          <Text style={[styles.metricBlockLabel, { color: colors.text }]}>{metric.label}</Text>
          {metric.unit ? (
            <Text style={[styles.metricBlockUnit, { color: colors.textMuted }]}>{metric.unit}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => onRemove(metric.id)} hitSlop={10}>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <TextInput
        style={[styles.metricInput, { color: colors.text, borderColor: color + "40", backgroundColor: colors.surface }]}
        value={String(metric.value ?? "")}
        onChangeText={(v) => {
          if (def?.inputType === "numeric") {
            onChangeValue(metric.id, v === "" ? "" : parseFloat(v) || v);
          } else {
            onChangeValue(metric.id, v);
          }
        }}
        placeholder={def?.placeholder ?? "Enter value"}
        placeholderTextColor={colors.textMuted}
        keyboardType={def?.inputType === "numeric" ? "decimal-pad" : "default"}
        returnKeyType="done"
      />
    </View>
  );
}

export default function NewDiaryEntryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { addDiaryEntry, updateDiaryEntry, diaryEntries, patient } = useApp();
  const isEdit = Boolean(entryId);

  const [date, setDate] = useState(todayDate());
  const [time, setTime] = useState(nowTime());
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [metrics, setMetrics] = useState<DiaryMetric[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showMetricPicker, setShowMetricPicker] = useState(false);

  // Load existing if editing
  useEffect(() => {
    if (entryId) {
      const existing = diaryEntries.find((e) => e.id === entryId);
      if (existing) {
        setDate(existing.date);
        setTime(existing.time);
        setMood(existing.mood);
        setMetrics(existing.metrics);
        setGeneralNotes(existing.generalNotes ?? "");
      }
    }
  }, [entryId]);

  const addMetric = (type: string) => {
    const def = getMetricDef(type);
    if (!def) return;
    if (metrics.find((m) => m.type === type)) {
      setShowMetricPicker(false);
      return;
    }
    const newMetric: DiaryMetric = {
      id: genId(),
      type,
      label: def.label,
      value: def.inputType === "scale" ? (def.min ?? 0) : "",
      unit: def.unit,
      icon: def.icon,
    };
    setMetrics((prev) => [...prev, newMetric]);
    setShowMetricPicker(false);
  };

  const removeMetric = (id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMetricValue = (id: string, value: string | number) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, value } : m)));
  };

  const handleSave = async () => {
    if (metrics.length === 0 && !generalNotes.trim() && mood === undefined) {
      Alert.alert("Empty Entry", "Please add at least one metric, mood, or note.");
      return;
    }
    setIsSaving(true);
    try {
      const entry: DiaryEntry = {
        id: entryId ?? genId(),
        patientId: patient?.id ?? "patient_001",
        date,
        time,
        mood,
        metrics,
        generalNotes: generalNotes.trim() || undefined,
        createdAt: isEdit
          ? (diaryEntries.find((e) => e.id === entryId)?.createdAt ?? new Date().toISOString())
          : new Date().toISOString(),
      };
      if (isEdit) {
        await updateDiaryEntry(entry);
      } else {
        await addDiaryEntry(entry);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const alreadyAdded = new Set(metrics.map((m) => m.type));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Date/Time row */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>When</Text>
            <View style={styles.dateTimeRow}>
              <View style={[styles.dateTimeField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  style={[styles.dateTimeInput, { color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.dateTimeField, { backgroundColor: colors.surface, borderColor: colors.border, flex: 0.6 }]}>
                <Feather name="clock" size={16} color={colors.primary} />
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  style={[styles.dateTimeInput, { color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          {/* Mood */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How are you feeling?</Text>
            <View style={styles.moodRow}>
              {Object.entries(MOOD_LABELS).map(([key, val]) => {
                const k = Number(key);
                const isSelected = mood === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setMood(isSelected ? undefined : k)}
                    style={({ pressed }) => [
                      styles.moodBtn,
                      {
                        backgroundColor: isSelected ? val.color + "20" : colors.surface,
                        borderColor: isSelected ? val.color : colors.border,
                        transform: [{ scale: pressed ? 0.94 : isSelected ? 1.06 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.moodBtnEmoji}>{val.emoji}</Text>
                    <Text style={[styles.moodBtnLabel, { color: isSelected ? val.color : colors.textSecondary }]}>
                      {val.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vitals & Metrics</Text>
              <Pressable
                onPress={() => setShowMetricPicker((v) => !v)}
                style={[styles.addMetricBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
              >
                <Feather name={showMetricPicker ? "chevron-up" : "plus"} size={15} color={colors.primary} />
                <Text style={[styles.addMetricBtnText, { color: colors.primary }]}>
                  {showMetricPicker ? "Close" : "Add Metric"}
                </Text>
              </Pressable>
            </View>

            {/* Metric picker */}
            {showMetricPicker && (
              <View style={[styles.metricPickerGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {METRIC_DEFINITIONS.map((def) => {
                  const added = alreadyAdded.has(def.type);
                  return (
                    <Pressable
                      key={def.type}
                      onPress={() => !added && addMetric(def.type)}
                      style={({ pressed }) => [
                        styles.metricPickerItem,
                        {
                          backgroundColor: added ? def.color + "15" : colors.surfaceSecondary,
                          borderColor: added ? def.color + "40" : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Feather name={def.icon as any} size={14} color={added ? def.color : colors.textSecondary} />
                      <Text
                        style={[
                          styles.metricPickerLabel,
                          { color: added ? def.color : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {def.label}
                      </Text>
                      {added && <Feather name="check" size={11} color={def.color} />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {metrics.map((m) => (
              <MetricInput
                key={m.id}
                metric={m}
                onChangeValue={updateMetricValue}
                onRemove={removeMetric}
                colors={colors}
              />
            ))}

            {metrics.length === 0 && !showMetricPicker && (
              <View style={[styles.metricsEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.metricsEmptyText, { color: colors.textMuted }]}>
                  No metrics added yet. Tap "Add Metric" to log your vitals.
                </Text>
              </View>
            )}
          </View>

          {/* General Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <TextInput
              value={generalNotes}
              onChangeText={setGeneralNotes}
              style={[styles.notesInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="How are you feeling today? Any symptoms, side effects, observations..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.saveBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.85 : 1 },
            ]}
          >
            <Feather name={isEdit ? "check" : "save"} size={17} color="#fff" />
            <Text style={styles.saveBtnText}>{isEdit ? "Update Entry" : "Save Entry"}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
    gap: 4,
  },
  section: {
    gap: 10,
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateTimeField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
  },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodBtnEmoji: { fontSize: 22 },
  moodBtnLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  addMetricBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  addMetricBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  metricPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  metricPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  metricPickerLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    maxWidth: 90,
  },
  metricBlock: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  metricBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricBlockTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricBlockLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  metricBlockUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metricInput: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  scaleStep: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleStepText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scaleHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metricsEmpty: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  metricsEmptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  notesInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 110,
    lineHeight: 22,
  },
  saveBar: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});

import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { NotificationItem } from "@/components/NotificationItem";
import { useApp } from "@/context/AppContext";
import type { DoseSchedule, Prescription } from "@/models";
import { isTimeInPast } from "@/utils/time";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { prescriptions } = useApp();
  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { upcoming, later } = useMemo(() => {
    const all: { prescription: Prescription; doseSchedule: DoseSchedule }[] = [];
    for (const rx of prescriptions) {
      for (const ds of rx.doseSchedules) {
        if (ds.status === "pending") {
          all.push({ prescription: rx, doseSchedule: ds });
        }
      }
    }
    all.sort((a, b) =>
      a.doseSchedule.scheduledTime.localeCompare(b.doseSchedule.scheduledTime)
    );

    const upcomingSoon: typeof all = [];
    const laterDoses: typeof all = [];

    const now = new Date();
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    for (const item of all) {
      const [h, m] = item.doseSchedule.scheduledTime.split(":").map(Number);
      const scheduled = new Date();
      scheduled.setHours(h, m, 0, 0);
      if (scheduled <= in2Hours) {
        upcomingSoon.push(item);
      } else {
        laterDoses.push(item);
      }
    }
    return { upcoming: upcomingSoon, later: laterDoses };
  }, [prescriptions]);

  const total = upcoming.length + later.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Upcoming Doses</Text>
          {total > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{total}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Doses you still need to take today
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        {total === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={40} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              All Caught Up!
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              You have no upcoming doses remaining today. Great job staying on track!
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
                  <Feather name="alert-circle" size={16} color={colors.warning} />
                  <Text style={[styles.sectionLabel, { color: colors.warning }]}>
                    Within 2 hours
                  </Text>
                </View>
                {upcoming.map(({ prescription, doseSchedule }, i) => (
                  <NotificationItem
                    key={doseSchedule.id}
                    prescription={prescription}
                    doseSchedule={doseSchedule}
                    isNext={i === 0}
                  />
                ))}
              </View>
            )}

            {later.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeader, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "20" }]}>
                  <Feather name="clock" size={16} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.primary }]}>
                    Later today
                  </Text>
                </View>
                {later.map(({ prescription, doseSchedule }) => (
                  <NotificationItem
                    key={doseSchedule.id}
                    prescription={prescription}
                    doseSchedule={doseSchedule}
                  />
                ))}
              </View>
            )}

            {/* Info footer */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Push notifications are coming soon. You'll receive reminders before each dose.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    marginTop: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});

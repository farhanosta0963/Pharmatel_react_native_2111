import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { useApp } from "@/context/AppContext";

export default function PrescriptionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { prescriptions, refreshPrescriptions } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPrescriptions();
    setRefreshing(false);
  };

  const active = prescriptions.filter((rx) => !rx.endDate || new Date(rx.endDate) >= new Date());
  const completed = prescriptions.filter((rx) => rx.endDate && new Date(rx.endDate) < new Date());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Prescription Schedule</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {active.length} active prescription{active.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {active.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active</Text>
            </View>
            {active.map((rx) => (
              <PrescriptionCard
                key={rx.id}
                prescription={rx}
                onPress={() =>
                  router.push({
                    pathname: "/medicine/[id]",
                    params: { id: rx.medicineId, prescriptionId: rx.id },
                  })
                }
              />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed</Text>
            </View>
            {completed.map((rx) => (
              <PrescriptionCard
                key={rx.id}
                prescription={rx}
                onPress={() =>
                  router.push({
                    pathname: "/medicine/[id]",
                    params: { id: rx.medicineId, prescriptionId: rx.id },
                  })
                }
              />
            ))}
          </View>
        )}

        {prescriptions.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="clipboard" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Prescriptions
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Your prescriptions will appear here once added by your doctor.
            </Text>
          </View>
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
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 8,
  },
  section: {
    gap: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

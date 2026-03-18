import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiaryEntry, DoseSchedule, ObservationSession, Prescription } from "@/models";
import {
  MOCK_OBSERVATION_SESSIONS,
  MOCK_PATIENT,
  MOCK_PRESCRIPTIONS,
  MOCK_SYMPTOM_DEFINITIONS,
} from "./mockData";

const KEYS = {
  AUTH_TOKEN: "auth_token",
  PATIENT: "patient",
  PRESCRIPTIONS: "prescriptions",
  OBSERVATION_SESSIONS: "observation_sessions",
  DIARY_ENTRIES: "diary_entries",
};

// Auth
export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

// Mock login - validates credentials and returns patient
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  await new Promise((r) => setTimeout(r, 800));
  if (username === "john.doe" && password === "password123") {
    const token = "mock_token_" + Date.now();
    await saveAuthToken(token);
    await AsyncStorage.setItem(KEYS.PATIENT, JSON.stringify(MOCK_PATIENT));
    return { success: true, token };
  }
  return { success: false, error: "Invalid username or password" };
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.PATIENT]);
}

// Prescriptions
export async function getPrescriptions(): Promise<Prescription[]> {
  const stored = await AsyncStorage.getItem(KEYS.PRESCRIPTIONS);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with mock data
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(MOCK_PRESCRIPTIONS));
  return MOCK_PRESCRIPTIONS;
}

export async function updateDoseSchedule(
  prescriptionId: string,
  doseScheduleId: string,
  updates: Partial<DoseSchedule>
): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  const updated = prescriptions.map((rx) => {
    if (rx.id !== prescriptionId) return rx;
    return {
      ...rx,
      doseSchedules: rx.doseSchedules.map((ds) =>
        ds.id === doseScheduleId ? { ...ds, ...updates } : ds
      ),
    };
  });
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(updated));
  return updated;
}

// Observation Sessions
export async function getObservationSessions(): Promise<ObservationSession[]> {
  const stored = await AsyncStorage.getItem(KEYS.OBSERVATION_SESSIONS);
  if (stored) {
    return JSON.parse(stored);
  }
  await AsyncStorage.setItem(
    KEYS.OBSERVATION_SESSIONS,
    JSON.stringify(MOCK_OBSERVATION_SESSIONS)
  );
  return MOCK_OBSERVATION_SESSIONS;
}

export async function saveObservationSession(
  session: ObservationSession
): Promise<void> {
  const sessions = await getObservationSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  await AsyncStorage.setItem(KEYS.OBSERVATION_SESSIONS, JSON.stringify(sessions));
}

export async function getObservationSessionByDose(
  doseScheduleId: string
): Promise<ObservationSession | null> {
  const sessions = await getObservationSessions();
  return sessions.find((s) => s.doseScheduleId === doseScheduleId) ?? null;
}

// Add / remove prescriptions
export async function addPrescription(prescription: Prescription): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  prescriptions.unshift(prescription);
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
  return prescriptions;
}

export async function removePrescription(prescriptionId: string): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  const updated = prescriptions.filter((rx) => rx.id !== prescriptionId);
  await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(updated));
  return updated;
}

// Diary Entries
export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const stored = await AsyncStorage.getItem(KEYS.DIARY_ENTRIES);
  if (stored) return JSON.parse(stored);
  return [];
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const entries = await getDiaryEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  await AsyncStorage.setItem(KEYS.DIARY_ENTRIES, JSON.stringify(entries));
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const entries = await getDiaryEntries();
  const updated = entries.filter((e) => e.id !== entryId);
  await AsyncStorage.setItem(KEYS.DIARY_ENTRIES, JSON.stringify(updated));
}

export { MOCK_SYMPTOM_DEFINITIONS };

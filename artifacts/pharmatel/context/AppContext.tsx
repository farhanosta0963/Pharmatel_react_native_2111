import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  DiaryEntry,
  DoseSchedule,
  ObservationSession,
  Patient,
  Prescription,
} from "@/models";
import {
  addPrescription,
  clearAuthToken,
  deleteDiaryEntry,
  getDiaryEntries,
  getAuthToken,
  getObservationSessionByDose,
  getObservationSessions,
  getPrescriptions,
  login as loginService,
  logout as logoutService,
  MOCK_SYMPTOM_DEFINITIONS,
  removePrescription,
  saveObservationSession,
  saveDiaryEntry,
  updateDoseSchedule,
} from "@/services/storage";

interface AppContextValue {
  patient: Patient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  prescriptions: Prescription[];
  observationSessions: ObservationSession[];
  diaryEntries: DiaryEntry[];
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  markDoseTaken: (
    prescriptionId: string,
    doseScheduleId: string,
    note?: string
  ) => Promise<void>;
  refreshPrescriptions: () => Promise<void>;
  saveObservation: (session: ObservationSession) => Promise<void>;
  getSessionForDose: (doseScheduleId: string) => Promise<ObservationSession | null>;
  symptomDefinitions: typeof MOCK_SYMPTOM_DEFINITIONS;
  addDiaryEntry: (entry: DiaryEntry) => Promise<void>;
  updateDiaryEntry: (entry: DiaryEntry) => Promise<void>;
  removeDiaryEntry: (entryId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [observationSessions, setObservationSessions] = useState<ObservationSession[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        const patientStr = await AsyncStorage.getItem("patient");
        if (patientStr) {
          setPatient(JSON.parse(patientStr));
          setIsAuthenticated(true);
          await loadData();
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    const [rxs, sessions, entries] = await Promise.all([
      getPrescriptions(),
      getObservationSessions(),
      getDiaryEntries(),
    ]);
    setPrescriptions(rxs);
    setObservationSessions(sessions);
    setDiaryEntries(entries);
  };

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginService(username, password);
      if (result.success) {
        const patientStr = await AsyncStorage.getItem("patient");
        if (patientStr) setPatient(JSON.parse(patientStr));
        setIsAuthenticated(true);
        await loadData();
      }
      return result;
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutService();
    setPatient(null);
    setIsAuthenticated(false);
    setPrescriptions([]);
    setObservationSessions([]);
    setDiaryEntries([]);
  }, []);

  const markDoseTaken = useCallback(
    async (prescriptionId: string, doseScheduleId: string, note?: string) => {
      const updates: Partial<DoseSchedule> = {
        status: "taken",
        takenAt: new Date().toISOString(),
        patientNote: note,
      };
      const updated = await updateDoseSchedule(prescriptionId, doseScheduleId, updates);
      setPrescriptions(updated);
    },
    []
  );

  const refreshPrescriptions = useCallback(async () => {
    const rxs = await getPrescriptions();
    setPrescriptions(rxs);
  }, []);

  const saveObservation = useCallback(async (session: ObservationSession) => {
    await saveObservationSession(session);
    const sessions = await getObservationSessions();
    setObservationSessions(sessions);
  }, []);

  const getSessionForDose = useCallback(
    async (doseScheduleId: string) => {
      return getObservationSessionByDose(doseScheduleId);
    },
    []
  );

  const addDiaryEntry = useCallback(async (entry: DiaryEntry) => {
    await saveDiaryEntry(entry);
    const entries = await getDiaryEntries();
    setDiaryEntries(entries);
  }, []);

  const updateDiaryEntry = useCallback(async (entry: DiaryEntry) => {
    await saveDiaryEntry(entry);
    const entries = await getDiaryEntries();
    setDiaryEntries(entries);
  }, []);

  const removeDiaryEntry = useCallback(async (entryId: string) => {
    await deleteDiaryEntry(entryId);
    setDiaryEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  return (
    <AppContext.Provider
      value={{
        patient,
        isAuthenticated,
        isLoading,
        prescriptions,
        observationSessions,
        diaryEntries,
        login,
        logout,
        markDoseTaken,
        refreshPrescriptions,
        saveObservation,
        getSessionForDose,
        symptomDefinitions: MOCK_SYMPTOM_DEFINITIONS,
        addDiaryEntry,
        updateDiaryEntry,
        removeDiaryEntry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export interface Patient {
  id: string;
  username: string;
  name: string;
  dateOfBirth: string;
  token?: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  dosageForm: "tablet" | "capsule" | "liquid" | "injection" | "cream" | "inhaler";
  strength: string;
  manufacturer?: string;
  description?: string;
  sideEffects?: string[];
}

export interface Prescription {
  id: string;
  patientId: string;
  medicineId: string;
  medicine: Medicine;
  dose: string;
  frequency: string;
  foodRequirement: "before_meal" | "after_meal" | "with_meal" | "any_time";
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  notes?: string;
  doseSchedules: DoseSchedule[];
}

export interface DoseSchedule {
  id: string;
  prescriptionId: string;
  scheduledTime: string;
  dayOfWeek?: string[];
  status: "pending" | "taken" | "missed" | "skipped";
  takenAt?: string;
  patientNote?: string;
  observationSessionId?: string;
}

export interface ObservationSession {
  id: string;
  doseScheduleId: string;
  startedAt: string;
  endedAt?: string;
  observations: Observation[];
}

export interface Observation {
  id: string;
  sessionId: string;
  symptomDefinitionId: string;
  symptomDefinition: SymptomDefinition;
  value: string | number | boolean;
  recordedAt: string;
}

export interface SymptomDefinition {
  id: string;
  name: string;
  type: "numeric" | "boolean" | "text";
  unit?: string;
  minValue?: number;
  maxValue?: number;
  description?: string;
}

export interface TodayDose {
  doseSchedule: DoseSchedule;
  prescription: Prescription;
  medicine: Medicine;
}

export type AppointmentStatus = "scheduled" | "done" | "cancelled" | "no_show";
export type AppointmentKind = "personal" | "group";

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  goal: string | null;
  notes: string | null;
  referral_partner: string | null;
  referral_share: number;
  active: boolean;
};

export type Tracking = "weight" | "time" | "weight_time";

export const TRACKING_LABELS: Record<Tracking, string> = {
  weight: "Súly + ismétlés",
  time: "Időtartam",
  weight_time: "Súly + időtartam",
};

export type Exercise = { id: string; name: string; icon: string; tracking: Tracking };

export type PassProduct = {
  id: string;
  name: string;
  total_sessions: number;
  paid_sessions: number;
  active: boolean;
};

export type PassBalance = {
  id: string;
  client_id: string;
  name: string;
  total_sessions: number;
  purchased_on: string;
  used_sessions: number;
  remaining_sessions: number;
};

export type Appointment = {
  id: string;
  kind: AppointmentKind;
  client_id: string | null;
  pass_id: string | null;
  title: string | null;
  starts_at: string;
  duration_min: number;
  status: AppointmentStatus;
  price: number | null;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  appointment_id: string;
  exercise_id: string;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
};

export type Settings = { session_price: number; group_session_rate: number };

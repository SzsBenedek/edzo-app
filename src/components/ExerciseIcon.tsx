import {
  Activity,
  BicepsFlexed,
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  HandFist,
  HeartPulse,
  Mountain,
  MoveVertical,
  PersonStanding,
  Repeat,
  Target,
  Timer,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** A választható gyakorlat-ikonok. A kulcs kerül az adatbázisba. */
export const EXERCISE_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  "biceps-flexed": BicepsFlexed,
  "hand-fist": HandFist,
  "person-standing": PersonStanding,
  footprints: Footprints,
  "move-vertical": MoveVertical,
  mountain: Mountain,
  bike: Bike,
  "heart-pulse": HeartPulse,
  activity: Activity,
  flame: Flame,
  zap: Zap,
  timer: Timer,
  repeat: Repeat,
  target: Target,
  waves: Waves,
};

export function ExerciseIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const Icon = EXERCISE_ICONS[name] ?? Dumbbell;
  return <Icon className={className} />;
}

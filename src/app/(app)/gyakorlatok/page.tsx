import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import type { Exercise } from "@/lib/types";
import { ExerciseManager } from "./ExerciseManager";

export default async function ExercisesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("exercises").select("id, name, icon, tracking").order("name");

  return (
    <>
      <PageHeader title="Gyakorlatok" subtitle={`${data?.length ?? 0} gyakorlat`} />
      <ExerciseManager exercises={(data ?? []) as Exercise[]} />
    </>
  );
}

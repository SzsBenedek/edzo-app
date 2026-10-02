import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import type { PassProduct, Settings } from "@/lib/types";
import { PassProducts, PricesForm, RecurringExpenses } from "./SettingsForms";

export default async function SettingsPage() {
  const { supabase } = await requireUser();
  const [{ data: settings }, { data: products }, { data: recurring }] = await Promise.all([
    supabase.from("settings").select("session_price, group_session_rate").single(),
    supabase.from("pass_products").select("*").order("active", { ascending: false }).order("total_sessions", { ascending: false }),
    supabase.from("recurring_expenses").select("id, name, category, amount, active").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Beállítások" />
      <div className="space-y-6">
        <PricesForm settings={(settings ?? { session_price: 0, group_session_rate: 5500 }) as Settings} />
        <PassProducts
          items={(products ?? []).map((p) => ({ ...p, paid_sessions: Number(p.paid_sessions) })) as PassProduct[]}
          sessionPrice={settings?.session_price ?? 0}
        />
        <RecurringExpenses items={recurring ?? []} />
      </div>
    </>
  );
}

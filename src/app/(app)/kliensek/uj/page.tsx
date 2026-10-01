import { requireUser } from "@/lib/supabase/server";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { createClient } from "../actions";
import { ClientForm } from "../ClientForm";

export default async function NewClientPage() {
  await requireUser();
  return (
    <div className="max-w-2xl">
      <BackLink href="/kliensek" label="Kliensek" />
      <PageHeader title="Új kliens" />
      <Card className="p-5">
        <ClientForm action={createClient} submitLabel="Kliens mentése" />
      </Card>
    </div>
  );
}

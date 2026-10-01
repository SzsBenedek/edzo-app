"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, SubmitButton, Textarea, type ActionState } from "@/components/form";
import type { Client } from "@/lib/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ClientForm({ action, client, submitLabel }: { action: Action; client?: Client; submitLabel: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [referred, setReferred] = useState(Boolean(client?.referral_partner || client?.referral_share));

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Név">
        <Input name="name" defaultValue={client?.name} required autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefon">
          <Input name="phone" type="tel" defaultValue={client?.phone ?? ""} autoComplete="off" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={client?.email ?? ""} autoComplete="off" />
        </Field>
      </div>
      <Field label="Cél">
        <Input name="goal" defaultValue={client?.goal ?? ""} placeholder="pl. fogyás, erősödés, rehab" />
      </Field>
      <Field label="Jegyzet">
        <Textarea name="notes" defaultValue={client?.notes ?? ""} placeholder="sérülések, preferenciák…" />
      </Field>

      <div className="rounded-xl border border-line p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="referred"
            checked={referred}
            onChange={(e) => setReferred(e.target.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          <span className="font-medium">Másik edzőtől / programból jött</span>
        </label>
        {referred && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ajánló">
              <Input name="referral_partner" defaultValue={client?.referral_partner ?? ""} placeholder="név vagy program" />
            </Field>
            <Field label="Ajánlónak járó rész (%)" hint="Ennyi megy le minden befizetéséből.">
              <Input
                name="referral_share"
                type="number"
                inputMode="decimal"
                min={0}
                max={99}
                step="any"
                defaultValue={client?.referral_share ? +(client.referral_share * 100).toFixed(2) : 33.33}
              />
            </Field>
          </div>
        )}
      </div>

      <FormError state={state} />
      {state.ok && <p className="text-sm text-ok">Mentve.</p>}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

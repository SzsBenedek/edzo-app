"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, Select, SubmitButton, type ActionState } from "@/components/form";
import { formatFt } from "@/lib/format";
import type { PassProduct } from "@/lib/types";
import { sellPass } from "../actions";

export function SellPassForm({
  clientId,
  products,
  sessionPrice,
  referralShare,
  today,
}: {
  clientId: string;
  products: PassProduct[];
  sessionPrice: number;
  referralShare: number;
  today: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const [price, setPrice] = useState(product ? product.paid_sessions * sessionPrice : 0);
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await sellPass(clientId, prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-line py-3 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        + Bérlet eladása
      </button>
    );
  }

  const fee = Math.round(price * referralShare);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-line p-4">
      <Field label="Bérlettípus">
        <Select
          name="product_id"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const p = products.find((x) => x.id === e.target.value);
            if (p) setPrice(p.paid_sessions * sessionPrice);
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.total_sessions} alkalom)
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ár (Ft)">
          <Input
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </Field>
        <Field label="Vásárlás napja">
          <Input name="purchased_on" type="date" defaultValue={today} />
        </Field>
      </div>
      {sessionPrice === 0 && (
        <p className="text-xs text-muted">Tipp: a Beállításokban megadott óraár alapján az ár automatikusan kitöltődik.</p>
      )}
      {fee > 0 && (
        <p className="text-sm text-muted">
          Ajánlónak jár: {formatFt(fee)} · Nálad marad: <b className="text-text">{formatFt(price - fee)}</b>
        </p>
      )}
      <FormError state={state} />
      <div className="flex gap-2">
        <SubmitButton>Eladás rögzítése</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 text-sm text-muted hover:text-text">
          Mégse
        </button>
      </div>
    </form>
  );
}

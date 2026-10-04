"use client";

import { useActionState } from "react";
import { saveSupplierAction, saveTrackingAction, type FormState } from "../../actions";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2";

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.error ? "text-accent-hover" : "text-pine"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function SupplierForm({ orderId, disabled, defaults }: { orderId: string; disabled: boolean; defaults: { supplierOrderId: string; supplierCost: string; supplierNotes: string } }) {
  const [state, action, pending] = useActionState(saveSupplierAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block text-sm font-semibold">
        N° de commande fournisseur
        <input name="supplierOrderId" defaultValue={defaults.supplierOrderId} className={input} disabled={disabled} />
      </label>
      <label className="block text-sm font-semibold">
        Coût réel payé au fournisseur (CAD, livraison incluse)
        <input name="supplierCost" inputMode="decimal" placeholder="ex. 18.45" defaultValue={defaults.supplierCost} className={input} disabled={disabled} />
      </label>
      <label className="block text-sm font-semibold">
        Notes internes
        <textarea name="supplierNotes" rows={3} defaultValue={defaults.supplierNotes} className={input} disabled={disabled} />
      </label>
      <button disabled={pending || disabled} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer la commande fournisseur"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function TrackingForm({ orderId, disabled, defaults }: { orderId: string; disabled: boolean; defaults: { carrier: string; trackingNumber: string; trackingUrl: string } }) {
  const [state, action, pending] = useActionState(saveTrackingAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block text-sm font-semibold">
        Transporteur
        <input name="carrier" required list="carriers" defaultValue={defaults.carrier} className={input} disabled={disabled} />
        <datalist id="carriers">
          <option value="Postes Canada" />
          <option value="Canada Post" />
          <option value="Purolator" />
          <option value="UPS" />
          <option value="FedEx" />
          <option value="DHL" />
          <option value="Cainiao" />
          <option value="YunExpress" />
        </datalist>
      </label>
      <label className="block text-sm font-semibold">
        Numéro de suivi
        <input name="trackingNumber" required defaultValue={defaults.trackingNumber} className={input} disabled={disabled} />
      </label>
      <label className="block text-sm font-semibold">
        Lien de suivi (facultatif, https)
        <input name="trackingUrl" type="url" defaultValue={defaults.trackingUrl} className={input} disabled={disabled} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked disabled={disabled} /> Envoyer le courriel d&apos;expédition au client
      </label>
      <button disabled={pending || disabled} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer le suivi"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

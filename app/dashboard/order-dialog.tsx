"use client";

import { useEffect, useRef, useState } from "react";

import { XIcon } from "@/components/icons";
import type { OrderStatus } from "@/lib/domain/orders";
import type { StaffOrder } from "@/lib/types";

export function OrderDialog({
  order,
  pending,
  online,
  onClose,
  onUpdate,
}: {
  order: StaffOrder;
  pending: boolean;
  online: boolean;
  onClose: () => void;
  onUpdate: (nextStatus: OrderStatus, description?: string) => Promise<void>;
}) {
  const [description, setDescription] = useState(order.description);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="order-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-box max-w-lg p-6">
        <button onClick={onClose} className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="Zatvori"><XIcon className="h-5 w-5" /></button>
        <p className={`status ${order.status === "ready" ? "status-success" : "status-primary"}`} aria-hidden="true" />
        <h2 id="order-title" className="mt-3 text-3xl font-black tracking-tight">{order.publicNumber}</h2>

        {order.status === "ordered" ? (
          <>
            <label className="fieldset mt-5">
              <span className="fieldset-legend font-semibold">Opis narudžbe</span>
              <textarea aria-label="Opis narudžbe" autoFocus className="textarea min-h-32 w-full text-base leading-6" maxLength={500} value={description} onInput={(event) => setDescription(event.currentTarget.value)} disabled={pending} />
              <span className="label justify-end">{description.length} / 500</span>
            </label>
            <button className="btn btn-primary btn-lg mt-5 w-full" disabled={pending || !online || !description.trim()} onClick={() => onUpdate("ordered", description)}>{pending ? <span className="loading loading-spinner" /> : null}Sačuvaj izmjene</button>
            <button className="btn btn-ghost mt-3 w-full text-error" disabled={pending || !online} onClick={() => onUpdate("cancelled")}>Otkaži narudžbu</button>
          </>
        ) : (
          <>
            <p className="mt-5 rounded-xl bg-success/10 p-4 text-base font-semibold text-success">Spremno za preuzimanje</p>
            <button autoFocus className="btn btn-success btn-lg mt-5 w-full" disabled={pending || !online} onClick={() => onUpdate("collected")}>{pending ? <span className="loading loading-spinner" /> : null}Označi kao preuzeto</button>
          </>
        )}
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Zatvori">close</button>
    </dialog>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { XIcon } from "@/components/icons";
import type { StaffOrder } from "@/lib/types";

export function QrDialog({ order, onClose }: { order: StaffOrder; onClose: () => void }) {
  const [source, setSource] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackingUrl = typeof window === "undefined" ? "" : `${window.location.origin}/track/${order.trackingToken}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    import("qrcode").then(({ toDataURL }) =>
      toDataURL(trackingUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" }).then((url) => {
        if (active) setSource(url);
      }),
    );
    return () => { active = false; };
  }, [trackingUrl]);

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="qr-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-box max-w-sm p-6 text-center">
        <button onClick={onClose} className="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="Zatvori QR kod"><XIcon className="h-5 w-5" /></button>
        <p className="text-sm font-semibold text-base-content/55">Narudžba</p>
        <h2 id="qr-title" className="mt-1 text-4xl font-black tracking-tight text-primary">{order.publicNumber}</h2>
        <div className="mx-auto my-5 aspect-square w-full max-w-64 rounded-2xl border border-base-300 bg-white p-3">
          {source ? <Image src={source} alt={`QR kod za praćenje narudžbe ${order.publicNumber}`} width={256} height={256} unoptimized className="h-full w-full" /> : <div className="skeleton h-full w-full" />}
        </div>
        <p className="text-sm leading-6 text-base-content/60">Kupac može skenirati ovaj kod. Ostat će otvoren dok ga ne zatvorite.</p>
        <button autoFocus onClick={onClose} className="btn btn-primary btn-lg mt-5 w-full">Gotovo</button>
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Zatvori">close</button>
    </dialog>
  );
}

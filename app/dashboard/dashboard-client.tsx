"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CheckIcon, ClockIcon, EditIcon, PlusIcon, QrIcon, RefreshIcon, WifiOffIcon } from "@/components/icons";
import { LocationHeader } from "@/components/location-header";
import { copy } from "@/lib/copy";
import type { OrderStatus } from "@/lib/domain/orders";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isLocationImageType, LOCATION_IMAGE_MAX_BYTES } from "@/lib/supabase/location-images";
import type { StaffOrder, StaffSnapshot } from "@/lib/types";

import { OrderDialog } from "./order-dialog";
import { QrDialog } from "./qr-dialog";

function orderTime(value: string) {
  return new Intl.DateTimeFormat("bs-BA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(file);
  });
}

export function DashboardClient({ initialSnapshot, demo }: { initialSnapshot: StaffSnapshot; demo: boolean }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [description, setDescription] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
  const [qrOrder, setQrOrder] = useState<StaffOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [online, setOnline] = useState(() => demo || typeof navigator === "undefined" || navigator.onLine);
  const [connected, setConnected] = useState(demo);
  const [backendReachable, setBackendReachable] = useState(true);
  const [error, setError] = useState("");
  const [lastSynced, setLastSynced] = useState(new Date());
  const idempotencyKey = useRef<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const canWrite = demo || (online && backendReachable);

  const refresh = useCallback(async () => {
    if (demo) { setLastSynced(new Date()); return; }
    try {
      const response = await fetch("/api/staff/queue", { cache: "no-store" });
      if (!response.ok) {
        setBackendReachable(false);
        return;
      }
      setSnapshot((await response.json()) as StaffSnapshot);
      setLastSynced(new Date());
      setBackendReachable(true);
    } catch {
      setBackendReachable(false);
      setConnected(false);
    }
  }, [demo]);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); void refresh(); };
    const handleOffline = () => { if (!demo) setOnline(false); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [demo, refresh]);

  useEffect(() => {
    if (demo) return;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`staff:${snapshot.locationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `location_id=eq.${snapshot.locationId}` }, () => void refresh())
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [demo, refresh, snapshot.locationId]);

  useEffect(() => {
    if (demo || connected || !online) return;
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [connected, demo, online, refresh]);

  const activeOrders = useMemo(
    () => snapshot.orders.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    [snapshot.orders],
  );
  const featured = activeOrders.find((order) => order.status === "ordered") ?? null;
  const remaining = activeOrders.filter((order) => order.id !== featured?.id);

  async function createOrder() {
    const normalized = description.trim();
    if (!normalized || normalized.length > 500 || pending || !canWrite) return;
    setPending(true);
    setError("");

    if (demo) {
      const created: StaffOrder = {
        id: crypto.randomUUID(), publicNumber: `C-${String(25 + snapshot.orders.length).padStart(3, "0")}`,
        description: normalized, status: "ordered", trackingToken: "demo", createdAt: new Date().toISOString(), readyAt: null,
      };
      setSnapshot((current) => ({ ...current, orders: [...current.orders, created] }));
      setDescription(""); setQrOrder(created); setPending(false); setLastSynced(new Date()); return;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/staff/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: normalized, idempotencyKey: idempotencyKey.current }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setBackendReachable(true);
      idempotencyKey.current = null;
      setDescription("");
      setQrOrder({ id: payload.id, publicNumber: payload.publicNumber, description: normalized, status: payload.status, trackingToken: payload.trackingToken, createdAt: payload.createdAt, readyAt: null });
      void refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Narudžbu nije moguće dodati.");
    } finally { setPending(false); }
  }

  function applyOrderUpdate(order: StaffOrder, nextStatus: OrderStatus, nextDescription?: string) {
    setSnapshot((current) => ({ ...current, orders: current.orders.flatMap((currentOrder) => {
      if (currentOrder.id !== order.id) return [currentOrder];
      if (["collected", "cancelled", "expired"].includes(nextStatus)) return [];
      return [{ ...currentOrder, status: nextStatus, description: nextDescription?.trim() || currentOrder.description, readyAt: nextStatus === "ready" ? new Date().toISOString() : currentOrder.readyAt }];
    }) }));
  }

  async function updateOrder(order: StaffOrder, nextStatus: OrderStatus, nextDescription?: string) {
    if (pending || !canWrite) return;
    setPending(true); setError("");
    if (demo) {
      applyOrderUpdate(order, nextStatus, nextDescription);
      setSelectedOrder(null); setPending(false); setLastSynced(new Date()); return;
    }
    try {
      const response = await fetch(`/api/staff/orders/${order.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedStatus: order.status, nextStatus, description: nextDescription ?? null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setBackendReachable(true);
      applyOrderUpdate(order, nextStatus, nextDescription);
      setSelectedOrder(null);
      void refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Izmjenu nije moguće sačuvati.");
    } finally { setPending(false); }
  }

  async function logout() {
    if (!demo) await createBrowserSupabaseClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function uploadLocationImage(file: File) {
    if (!isLocationImageType(file.type)) {
      setError("Odaberite JPG, PNG ili WebP sliku.");
      return;
    }
    if (file.size > LOCATION_IMAGE_MAX_BYTES) {
      setError("Slika može imati najviše 2 MB.");
      return;
    }

    setImageUploading(true);
    setError("");
    try {
      if (demo) {
        const imageUrl = await readAsDataUrl(file);
        setSnapshot((current) => ({ ...current, locationImageUrl: imageUrl }));
        return;
      }

      const formData = new FormData();
      formData.set("image", file);
      const response = await fetch("/api/staff/location-image", { method: "POST", body: formData });
      const payload = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error ?? "Sliku trenutno nije moguće sačuvati.");
      setSnapshot((current) => ({ ...current, locationImageUrl: payload.imageUrl ?? null }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sliku trenutno nije moguće sačuvati.");
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-base-200/60" onTouchStart={(event) => { if (window.scrollY === 0) touchStart.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientY; if (touchStart.current !== null && end && end - touchStart.current > 80) void refresh(); touchStart.current = null; }}>
      <LocationHeader
        locationName={snapshot.locationName}
        imageUrl={snapshot.locationImageUrl}
        imageUploading={imageUploading}
        imageUploadDisabled={!canWrite}
        onImageChange={(file) => void uploadLocationImage(file)}
        onLogout={() => void logout()}
      />
      <main className="safe-bottom mx-auto w-full max-w-3xl px-5 py-7 sm:px-7 sm:py-9">
        {!online || !connected || !backendReachable ? <div role="alert" className="alert alert-warning mb-5"><WifiOffIcon className="h-5 w-5" /><span>{!online ? copy.offline : !backendReachable ? copy.backendUnavailable : copy.stale}</span><button type="button" className="btn btn-sm" disabled={!online} onClick={() => void refresh()}><RefreshIcon className="h-4 w-4" />Osvježi</button></div> : null}
        {error ? <div role="alert" className="alert alert-error mb-5"><span>{error}</span></div> : null}

        <section aria-labelledby="new-order-title" className="rounded-2xl bg-base-100 p-5 shadow-sm sm:p-6">
          <h1 id="new-order-title" className="text-xl font-bold tracking-tight">Nova narudžba</h1>
          <textarea className="textarea textarea-lg mt-4 min-h-36 w-full resize-y text-base leading-6 focus:border-primary focus:outline-primary" placeholder="Upišite narudžbu…" maxLength={500} value={description} disabled={pending || !canWrite} onInput={(event) => setDescription(event.currentTarget.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void createOrder(); } }} />
          <div className="mt-1 flex justify-between px-1 text-sm text-base-content/50"><span>Do 500 znakova</span><span>{description.length} / 500</span></div>
          <button className="btn btn-primary btn-lg mt-4 w-full text-base" disabled={!description.trim() || pending || !canWrite} onClick={() => void createOrder()}>{pending ? <span className="loading loading-spinner" /> : <PlusIcon className="h-6 w-6" />}Dodaj narudžbu</button>
        </section>

        <section aria-labelledby="next-order-title" className="mt-9">
          <h2 id="next-order-title" className="text-xl font-bold tracking-tight">Sljedeća narudžba</h2>
          {featured ? (
            <article className="card mt-4 border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-4xl font-black tracking-tight">{featured.publicNumber}</p><p className="mt-3 whitespace-pre-wrap text-base leading-7 text-base-content/75">{featured.description}</p></div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn btn-square btn-ghost border border-base-300 text-primary" onClick={() => setSelectedOrder(featured)} aria-label={`Uredi narudžbu ${featured.publicNumber}`}><EditIcon className="h-5 w-5" /></button>
                    <button type="button" className="btn btn-square btn-ghost border border-base-300 text-primary" onClick={() => setQrOrder(featured)} aria-label={`Prikaži QR kod za ${featured.publicNumber}`}><QrIcon className="h-6 w-6" /></button>
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-lg w-full" disabled={pending || !canWrite} onClick={() => void updateOrder(featured, "ready")}>{pending ? <span className="loading loading-spinner" /> : <CheckIcon className="h-6 w-6" />}Označi kao spremno</button>
              </div>
            </article>
          ) : <div className="mt-4 rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/55">Nema narudžbi koje čekaju pripremu.</div>}
        </section>

        <section aria-labelledby="active-orders-title" className="mt-9">
          <h2 id="active-orders-title" className="text-xl font-bold tracking-tight">Aktivne narudžbe</h2>
          <ul className="list mt-4 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            {remaining.length ? remaining.map((order) => (
              <li key={order.id} className="flex items-center gap-2 border-b border-base-300 p-2 last:border-b-0">
                <div className="flex min-w-0 flex-1 items-start gap-3 p-2">
                  <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${order.status === "ready" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{order.status === "ready" ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</span>
                  <span className="min-w-0"><span className="flex items-center gap-2"><span className="text-lg font-bold">{order.publicNumber}</span><span className={`text-sm font-semibold ${order.status === "ready" ? "text-success" : "text-primary"}`}>{copy.statuses[order.status]}</span></span><span className="line-clamp-2 text-sm leading-5 text-base-content/65">{order.description}</span><time className="mt-1 block text-xs text-base-content/45">{orderTime(order.createdAt)}</time></span>
                </div>
                <div className="mr-2 grid shrink-0 grid-cols-2 gap-2">
                  {order.status === "ordered" ? <button type="button" className="btn btn-square btn-ghost border border-base-300 text-primary" onClick={() => setSelectedOrder(order)} aria-label={`Uredi narudžbu ${order.publicNumber}`}><EditIcon className="h-5 w-5" /></button> : <button type="button" className="btn btn-square btn-success btn-soft" onClick={() => setSelectedOrder(order)} aria-label={`Otvori preuzimanje za ${order.publicNumber}`}><CheckIcon className="h-5 w-5" /></button>}
                  <button type="button" className="btn btn-square btn-ghost border border-base-300 text-primary" onClick={() => setQrOrder(order)} aria-label={`Prikaži QR kod za ${order.publicNumber}`}><QrIcon className="h-5 w-5" /></button>
                  {order.status === "ordered" ? <button type="button" className="btn btn-primary btn-sm col-span-2" disabled={pending || !canWrite} onClick={() => void updateOrder(order, "ready")} aria-label={`Označi ${order.publicNumber} kao spremno`}><CheckIcon className="h-4 w-4" />Spremno</button> : null}
                </div>
              </li>
            )) : <li className="p-7 text-center text-sm text-base-content/55">Nema drugih aktivnih narudžbi.</li>}
          </ul>
        </section>

        <footer className="mt-7 flex items-center justify-center gap-2 text-sm text-base-content/50"><span className={`status ${connected && online && backendReachable ? "status-success" : "status-warning"}`} /><RefreshIcon className="h-4 w-4" /><span>{connected && online && backendReachable ? "Ažurirano" : "Povezivanje"} {lastSynced.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })}</span></footer>
      </main>
      {qrOrder ? <QrDialog order={qrOrder} onClose={() => setQrOrder(null)} /> : null}
      {selectedOrder ? <OrderDialog order={selectedOrder} pending={pending} online={canWrite} onClose={() => setSelectedOrder(null)} onUpdate={(nextStatus, nextDescription) => updateOrder(selectedOrder, nextStatus, nextDescription)} /> : null}
    </div>
  );
}

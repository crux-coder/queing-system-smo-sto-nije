"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandHeader } from "@/components/brand-header";
import { CheckIcon, ClockIcon, PlusIcon, QrIcon, RefreshIcon, WifiOffIcon } from "@/components/icons";
import { copy } from "@/lib/copy";
import type { OrderStatus } from "@/lib/domain/orders";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { StaffOrder, StaffSnapshot } from "@/lib/types";

import { OrderDialog } from "./order-dialog";
import { QrDialog } from "./qr-dialog";

function orderTime(value: string) {
  return new Intl.DateTimeFormat("bs-BA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function DashboardClient({ initialSnapshot, demo }: { initialSnapshot: StaffSnapshot; demo: boolean }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [description, setDescription] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
  const [qrOrder, setQrOrder] = useState<StaffOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(() => demo || typeof navigator === "undefined" || navigator.onLine);
  const [connected, setConnected] = useState(demo);
  const [error, setError] = useState("");
  const [lastSynced, setLastSynced] = useState(new Date());
  const idempotencyKey = useRef<string | null>(null);
  const touchStart = useRef<number | null>(null);
  const canWrite = demo || (online && connected);

  const refresh = useCallback(async () => {
    if (demo) { setLastSynced(new Date()); return; }
    try {
      const response = await fetch("/api/staff/queue", { cache: "no-store" });
      if (!response.ok) return;
      setSnapshot((await response.json()) as StaffSnapshot);
      setLastSynced(new Date());
    } catch {
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
      idempotencyKey.current = null;
      setDescription("");
      setQrOrder({ id: payload.id, publicNumber: payload.publicNumber, description: normalized, status: payload.status, trackingToken: payload.trackingToken, createdAt: payload.createdAt, readyAt: null });
      void refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Narudžbu nije moguće dodati.");
    } finally { setPending(false); }
  }

  async function updateOrder(nextStatus: OrderStatus, nextDescription?: string) {
    if (!selectedOrder || pending || !canWrite) return;
    setPending(true); setError("");
    if (demo) {
      setSnapshot((current) => ({ ...current, orders: current.orders.flatMap((order) => {
        if (order.id !== selectedOrder.id) return [order];
        if (["collected", "cancelled", "expired"].includes(nextStatus)) return [];
        return [{ ...order, status: nextStatus, description: nextDescription?.trim() || order.description, readyAt: nextStatus === "ready" ? new Date().toISOString() : order.readyAt }];
      }) }));
      setSelectedOrder(null); setPending(false); setLastSynced(new Date()); return;
    }
    try {
      const response = await fetch(`/api/staff/orders/${selectedOrder.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedStatus: selectedOrder.status, nextStatus, description: nextDescription ?? null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
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

  return (
    <div className="min-h-dvh bg-base-200/60" onTouchStart={(event) => { if (window.scrollY === 0) touchStart.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientY; if (touchStart.current !== null && end && end - touchStart.current > 80) void refresh(); touchStart.current = null; }}>
      <BrandHeader locationName={snapshot.locationName} onLogout={() => void logout()} />
      <main className="safe-bottom mx-auto w-full max-w-3xl px-5 py-7 sm:px-7 sm:py-9">
        {!online || !connected ? <div role="alert" className="alert alert-warning mb-5"><WifiOffIcon className="h-5 w-5" /><span>{!online ? copy.offline : copy.stale}</span><button type="button" className="btn btn-sm" disabled={!online} onClick={() => void refresh()}><RefreshIcon className="h-4 w-4" />Osvježi</button></div> : null}
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
                  <button className="btn btn-square btn-ghost border border-base-300 text-primary" onClick={() => setQrOrder(featured)} aria-label={`Prikaži QR kod za ${featured.publicNumber}`}><QrIcon className="h-6 w-6" /></button>
                </div>
                <button className="btn btn-primary btn-lg w-full" onClick={() => setSelectedOrder(featured)}><CheckIcon className="h-6 w-6" />Označi kao spremno</button>
              </div>
            </article>
          ) : <div className="mt-4 rounded-2xl border border-dashed border-base-300 bg-base-100 p-8 text-center text-base-content/55">Nema narudžbi koje čekaju pripremu.</div>}
        </section>

        <section aria-labelledby="active-orders-title" className="mt-9">
          <h2 id="active-orders-title" className="text-xl font-bold tracking-tight">Aktivne narudžbe</h2>
          <ul className="list mt-4 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            {remaining.length ? remaining.map((order) => (
              <li key={order.id} className="flex items-center gap-2 border-b border-base-300 p-2 last:border-b-0">
                <button type="button" className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 text-left hover:bg-base-200/60 focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setSelectedOrder(order)}>
                  <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${order.status === "ready" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{order.status === "ready" ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</span>
                  <span className="min-w-0"><span className="flex items-center gap-2"><span className="text-lg font-bold">{order.publicNumber}</span><span className={`text-sm font-semibold ${order.status === "ready" ? "text-success" : "text-primary"}`}>{copy.statuses[order.status]}</span></span><span className="line-clamp-2 text-sm leading-5 text-base-content/65">{order.description}</span><time className="mt-1 block text-xs text-base-content/45">{orderTime(order.createdAt)}</time></span>
                </button>
                <button type="button" className="btn btn-square btn-ghost mr-2 border border-base-300 text-primary" onClick={() => setQrOrder(order)} aria-label={`Prikaži QR kod za ${order.publicNumber}`}><QrIcon className="h-5 w-5" /></button>
              </li>
            )) : <li className="p-7 text-center text-sm text-base-content/55">Nema drugih aktivnih narudžbi.</li>}
          </ul>
        </section>

        <footer className="mt-7 flex items-center justify-center gap-2 text-sm text-base-content/50"><span className={`status ${connected && online ? "status-success" : "status-warning"}`} /><RefreshIcon className="h-4 w-4" /><span>{connected && online ? "Ažurirano" : "Povezivanje"} {lastSynced.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })}</span></footer>
      </main>
      {qrOrder ? <QrDialog order={qrOrder} onClose={() => setQrOrder(null)} /> : null}
      {selectedOrder ? <OrderDialog order={selectedOrder} pending={pending} online={canWrite} onClose={() => setSelectedOrder(null)} onUpdate={updateOrder} /> : null}
    </div>
  );
}

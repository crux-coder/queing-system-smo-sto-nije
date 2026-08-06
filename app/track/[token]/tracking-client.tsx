"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandHeader } from "@/components/brand-header";
import { CheckIcon, ClockIcon, RefreshIcon, WifiOffIcon } from "@/components/icons";
import { copy } from "@/lib/copy";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PublicQueueOrder, TrackingSnapshot } from "@/lib/types";

function QueueSection({
  title,
  orders,
  trackedOrderId,
  ready,
}: {
  title: string;
  orders: PublicQueueOrder[];
  trackedOrderId: string;
  ready: boolean;
}) {
  return (
    <section className="mt-9" aria-labelledby={ready ? "ready-title" : "ordered-title"}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${ready ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{ready ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</div>
        <h2 id={ready ? "ready-title" : "ordered-title"} className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <ul className="list mt-4 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        {orders.length ? orders.map((order) => {
          const mine = order.orderId === trackedOrderId;
          return (
            <li key={order.orderId} className={`list-row items-center border-b border-base-300 p-4 last:border-b-0 ${mine ? "bg-primary/8" : ""}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${ready ? "bg-success text-success-content" : "bg-primary/10 text-primary"}`}>{ready ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</div>
              <span className="text-lg font-bold">{order.publicNumber}</span>
              {mine ? <span className="ml-auto text-sm font-bold text-primary">Vaša</span> : <span className={`ml-auto text-sm font-semibold ${ready ? "text-success" : "text-base-content/45"}`}>{ready ? "Spremno" : "U pripremi"}</span>}
            </li>
          );
        }) : <li className="p-6 text-center text-sm text-base-content/50">Trenutno nema narudžbi u ovoj grupi.</li>}
      </ul>
    </section>
  );
}

function TerminalState({ snapshot }: { snapshot: TrackingSnapshot }) {
  const terminalCopy = {
    collected: ["Narudžba je preuzeta", "Hvala vam i prijatno!"],
    cancelled: ["Narudžba je otkazana", "Molimo obratite se osoblju lokacije."],
    expired: ["Narudžba više nije aktivna", "Ovaj link je stariji od 24 sata."],
  } as const;
  const [title, message] = terminalCopy[snapshot.status as keyof typeof terminalCopy];
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-81px)] w-full max-w-2xl items-center px-5 py-10">
      <section className="card w-full border border-base-300 bg-base-100 text-center shadow-sm">
        <div className="card-body items-center gap-4 p-8 sm:p-12">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${snapshot.status === "collected" ? "bg-success/10 text-success" : "bg-base-200 text-base-content/55"}`}><CheckIcon className="h-8 w-8" /></div>
          <p className="text-4xl font-black tracking-tight">{snapshot.publicNumber}</p>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-base text-base-content/60">{message}</p>
        </div>
      </section>
    </main>
  );
}

export function TrackingClient({ token, initialSnapshot, demo }: { token: string; initialSnapshot: TrackingSnapshot; demo: boolean }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connected, setConnected] = useState(demo);
  const [online, setOnline] = useState(() => demo || typeof navigator === "undefined" || navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const touchStart = useRef<number | null>(null);
  const previousStatus = useRef(initialSnapshot.status);
  const isActive = snapshot.queue !== null;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/track/${token}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as TrackingSnapshot;
      if (previousStatus.current !== "ready" && next.status === "ready") navigator.vibrate?.([180, 80, 180]);
      previousStatus.current = next.status;
      setSnapshot(next);
      setLastSynced(new Date());
    } finally { setRefreshing(false); }
  }, [token]);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); void refresh(); };
    const handleOffline = () => { if (!demo) setOnline(false); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, [demo, refresh]);

  useEffect(() => {
    if (demo || !isActive) return;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`queue:${snapshot.locationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "public_queue", filter: `location_id=eq.${snapshot.locationId}` }, () => void refresh())
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [demo, isActive, refresh, snapshot.locationId]);

  useEffect(() => {
    if (connected || !online || !isActive) return;
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [connected, isActive, online, refresh]);

  const queue = useMemo(() => snapshot.queue ?? [], [snapshot.queue]);
  const ready = useMemo(() => queue.filter((order) => order.status === "ready").toSorted((a, b) => (a.readyAt ?? "").localeCompare(b.readyAt ?? "") || a.orderId.localeCompare(b.orderId)), [queue]);
  const ordered = useMemo(() => queue.filter((order) => order.status === "ordered").toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.orderId.localeCompare(b.orderId)), [queue]);
  const tracked = queue.find((order) => order.orderId === snapshot.trackedOrderId);
  const ahead = tracked ? ordered.filter((order) => order.createdAt < tracked.createdAt || (order.createdAt === tracked.createdAt && order.orderId < tracked.orderId)).length : 0;

  if (!snapshot.queue) return <div className="min-h-dvh bg-base-200/60"><BrandHeader locationName={snapshot.locationName} /><TerminalState snapshot={snapshot} /></div>;

  const isReady = snapshot.status === "ready";
  return (
    <div className="min-h-dvh bg-base-200/60" onTouchStart={(event) => { if (window.scrollY === 0) touchStart.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientY; if (touchStart.current !== null && end && end - touchStart.current > 80) void refresh(); touchStart.current = null; }}>
      <BrandHeader locationName={snapshot.locationName} />
      <main className="safe-bottom mx-auto w-full max-w-2xl px-5 py-7 sm:px-7 sm:py-9">
        {!online || !connected ? <div role="status" className="alert alert-warning mb-6"><WifiOffIcon className="h-5 w-5" /><span>{!online ? "Nema internetske veze. Prikazujemo posljednje podatke." : copy.stale}</span></div> : null}

        <div className={`aura aura-glow aura-lg w-full ${isReady ? "text-success" : "text-violet-400"}`}>
          <section className="card w-full bg-base-100 text-base-content shadow-sm" aria-labelledby="tracking-title">
            <div className="card-body items-center gap-5 p-6 text-center sm:p-9">
              <p className={`rounded-2xl px-6 py-3 text-4xl font-black tracking-tight ${isReady ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{snapshot.publicNumber}</p>
              <div><h1 id="tracking-title" className="text-2xl font-black tracking-tight sm:text-3xl">{isReady ? "Vaša narudžba je spremna!" : "Pripremamo vašu narudžbu"}</h1><p className="mt-2 text-base text-base-content/60">{isReady ? "Možete je preuzeti na pultu." : ahead === 0 ? "Vaša narudžba je sljedeća za pripremu." : `Još otprilike ${ahead} ${ahead === 1 ? "narudžba" : "narudžbe"} prije vaše`}</p></div>
              <ul className="steps w-full text-xs font-semibold sm:text-sm" aria-label="Napredak narudžbe">
                <li className="step step-success">Zaprimljena</li>
                <li className={`step ${isReady ? "step-success" : "step-primary"}`}>U pripremi</li>
                <li className={`step ${isReady ? "step-success" : ""}`}>Spremna</li>
              </ul>
            </div>
          </section>
        </div>

        <QueueSection title="Spremno za preuzimanje" orders={ready} trackedOrderId={snapshot.trackedOrderId} ready />
        <QueueSection title="U pripremi" orders={ordered} trackedOrderId={snapshot.trackedOrderId} ready={false} />

        <footer className="mt-8 flex items-center justify-between gap-4 border-t border-base-300 pt-5 text-sm text-base-content/50">
          <div className="flex min-w-0 items-center gap-2"><span className={`status ${connected && online ? "status-success" : "status-warning"}`} /><span className="truncate">Ažurirano {lastSynced.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })}</span></div>
          <button className="btn btn-outline min-h-12 shrink-0" onClick={() => void refresh()} disabled={refreshing || !online}><RefreshIcon className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />Osvježi</button>
        </footer>
      </main>
    </div>
  );
}

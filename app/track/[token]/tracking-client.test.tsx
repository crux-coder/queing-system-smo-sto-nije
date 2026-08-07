/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TrackingSnapshot } from "@/lib/types";

import { TrackingClient } from "./tracking-client";

const supabaseMock = vi.hoisted(() => {
  const subscriptions: Array<{
    filter: { event: string; filter?: string };
    handler: (payload: { old: Record<string, unknown> }) => void;
  }> = [];
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockImplementation((_type, filter, handler) => {
    subscriptions.push({ filter, handler });
    return channel;
  });
  channel.subscribe.mockImplementation((handler: (status: string) => void) => {
    handler("SUBSCRIBED");
    return channel;
  });

  return {
    subscriptions,
    client: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => supabaseMock.client,
}));

const readySnapshot: TrackingSnapshot = {
  locationId: "location-1",
  locationName: "Test restoran",
  trackedOrderId: "order-1",
  publicNumber: "C-001",
  status: "ready",
  createdAt: "2026-08-07T10:00:00.000Z",
  readyAt: "2026-08-07T10:05:00.000Z",
  collectedAt: null,
  cancelledAt: null,
  expiredAt: null,
  queue: [
    {
      orderId: "order-1",
      locationId: "location-1",
      publicNumber: "C-001",
      status: "ready",
      createdAt: "2026-08-07T10:00:00.000Z",
      readyAt: "2026-08-07T10:05:00.000Z",
    },
  ],
};

describe("TrackingClient terminal reconciliation", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    supabaseMock.subscriptions.length = 0;
  });

  it("refreshes immediately when Realtime deletes the tracked public queue row", async () => {
    const collectedSnapshot: TrackingSnapshot = {
      ...readySnapshot,
      status: "collected",
      collectedAt: "2026-08-07T10:10:00.000Z",
      queue: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => collectedSnapshot,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrackingClient token="tracking-token" initialSnapshot={readySnapshot} demo={false} />);
    const deleteSubscription = supabaseMock.subscriptions.find(({ filter }) => filter.event === "DELETE" && !filter.filter);
    expect(deleteSubscription).toBeDefined();

    await act(async () => {
      deleteSubscription?.handler({ old: { order_id: "order-1" } });
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Narudžba je preuzeta" })).toBeInTheDocument();
  });

  it("ignores public queue deletions for other orders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<TrackingClient token="tracking-token" initialSnapshot={readySnapshot} demo={false} />);
    const deleteSubscription = supabaseMock.subscriptions.find(({ filter }) => filter.event === "DELETE" && !filter.filter);

    await act(async () => {
      deleteSubscription?.handler({ old: { order_id: "another-order" } });
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Vaša narudžba je spremna!" })).toBeInTheDocument();
  });

  it("shows collected after polling even while Realtime remains connected", async () => {
    vi.useFakeTimers();
    const collectedSnapshot: TrackingSnapshot = {
      ...readySnapshot,
      status: "collected",
      collectedAt: "2026-08-07T10:10:00.000Z",
      queue: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => collectedSnapshot,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrackingClient token="tracking-token" initialSnapshot={readySnapshot} demo={false} />);
    expect(screen.getByRole("heading", { name: "Vaša narudžba je spremna!" })).toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/track/tracking-token", { cache: "no-store" });
    expect(screen.getByRole("heading", { name: "Narudžba je preuzeta" })).toBeInTheDocument();
  });
});

/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TrackingSnapshot } from "@/lib/types";

import { TrackingClient } from "./tracking-client";

const supabaseMock = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockImplementation(() => channel);
  channel.subscribe.mockImplementation((handler: (status: string) => void) => {
    handler("SUBSCRIBED");
    return channel;
  });

  return {
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

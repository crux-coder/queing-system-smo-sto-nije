import type { StaffSnapshot, TrackingSnapshot } from "@/lib/types";

const day = "2026-08-07";

export const demoStaffSnapshot: StaffSnapshot = {
  locationId: "demo-location",
  locationName: "Ćevabdžinica Kod Muje",
  orders: [
    {
      id: "demo-22",
      publicNumber: "C-022",
      description: "Veliki ćevapi, luk sa strane, jogurt",
      status: "ordered",
      trackingToken: "demo",
      createdAt: `${day}T10:38:00.000Z`,
      readyAt: null,
    },
    {
      id: "demo-23",
      publicNumber: "C-023",
      description: "Pileći sendvič bez majoneze",
      status: "ordered",
      trackingToken: "demo-23",
      createdAt: `${day}T10:41:00.000Z`,
      readyAt: null,
    },
    {
      id: "demo-24",
      publicNumber: "C-024",
      description: "Dvije male pljeskavice",
      status: "ordered",
      trackingToken: "demo-24",
      createdAt: `${day}T10:43:00.000Z`,
      readyAt: null,
    },
    {
      id: "demo-21",
      publicNumber: "C-021",
      description: "Mali ćevapi i sok",
      status: "ready",
      trackingToken: "demo-21",
      createdAt: `${day}T10:34:00.000Z`,
      readyAt: `${day}T10:37:00.000Z`,
    },
  ],
};

export const demoTrackingSnapshot: TrackingSnapshot = {
  locationId: "demo-location",
  locationName: "Ćevabdžinica Kod Muje",
  trackedOrderId: "demo-24",
  publicNumber: "C-024",
  status: "ordered",
  createdAt: `${day}T10:43:00.000Z`,
  readyAt: null,
  collectedAt: null,
  cancelledAt: null,
  expiredAt: null,
  queue: [
    {
      orderId: "demo-19",
      locationId: "demo-location",
      publicNumber: "C-019",
      status: "ready",
      createdAt: `${day}T10:28:00.000Z`,
      readyAt: `${day}T10:35:00.000Z`,
    },
    {
      orderId: "demo-21",
      locationId: "demo-location",
      publicNumber: "C-021",
      status: "ready",
      createdAt: `${day}T10:34:00.000Z`,
      readyAt: `${day}T10:37:00.000Z`,
    },
    ...[22, 23, 24, 25].map((number, index) => ({
      orderId: `demo-${number}`,
      locationId: "demo-location",
      publicNumber: `C-0${number}`,
      status: "ordered" as const,
      createdAt: `${day}T10:${40 + index}:00.000Z`,
      readyAt: null,
    })),
  ],
};

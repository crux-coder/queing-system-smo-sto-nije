import type { OrderStatus } from "@/lib/domain/orders";

export type StaffOrder = {
  id: string;
  publicNumber: string;
  description: string;
  status: OrderStatus;
  trackingToken: string;
  createdAt: string;
  readyAt: string | null;
};

export type StaffSnapshot = {
  locationId: string;
  locationName: string;
  orders: StaffOrder[];
};

export type PublicQueueOrder = {
  orderId: string;
  locationId: string;
  publicNumber: string;
  status: "ordered" | "ready";
  createdAt: string;
  readyAt: string | null;
};

export type TrackingSnapshot = {
  locationId: string;
  locationName: string;
  trackedOrderId: string;
  publicNumber: string;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  queue: PublicQueueOrder[] | null;
};

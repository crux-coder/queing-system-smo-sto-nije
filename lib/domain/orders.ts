export type OrderStatus =
  | "ordered"
  | "ready"
  | "collected"
  | "cancelled"
  | "expired";

export type QueueOrder = {
  id: string;
  status: OrderStatus;
  createdAt: string;
};

export function formatPublicOrderNumber(date: Date, sequence: number) {
  const utcDay = date.getUTCDay();
  const prefixIndex = utcDay === 0 ? 6 : utcDay - 1;
  const prefix = String.fromCharCode("A".charCodeAt(0) + prefixIndex);

  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

export function compareActiveOrders(a: QueueOrder, b: QueueOrder) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function estimateOrdersAhead(orders: QueueOrder[], trackedId: string) {
  const trackedOrder = orders.find((order) => order.id === trackedId);

  if (!trackedOrder) return 0;

  return orders.filter(
    (order) =>
      order.status === "ordered" &&
      order.id !== trackedId &&
      compareActiveOrders(order, trackedOrder) < 0,
  ).length;
}

const STAFF_TRANSITIONS = new Set([
  "ordered:ready",
  "ordered:cancelled",
  "ready:collected",
]);

export function isAllowedTransition(from: OrderStatus, to: OrderStatus) {
  return STAFF_TRANSITIONS.has(`${from}:${to}`);
}

export function normalizeDescription(value: string) {
  const description = value.trim();

  if (!description) throw new Error("Narudžba je prazna.");
  if (description.length > 500) {
    throw new Error("Narudžba može imati najviše 500 znakova.");
  }

  return description;
}

export function orderExpiresAt(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

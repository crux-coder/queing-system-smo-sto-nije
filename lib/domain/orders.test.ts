import { describe, expect, it } from "vitest";

import {
  compareActiveOrders,
  estimateOrdersAhead,
  formatPublicOrderNumber,
  isAllowedTransition,
  normalizeDescription,
  orderExpiresAt,
  type QueueOrder,
} from "./orders";

describe("public order numbers", () => {
  it("maps UTC weekdays from Monday A through Sunday G and pads only below 1000", () => {
    expect(formatPublicOrderNumber(new Date("2026-08-03T23:59:59Z"), 1)).toBe(
      "A-001",
    );
    expect(formatPublicOrderNumber(new Date("2026-08-09T00:00:00Z"), 42)).toBe(
      "G-042",
    );
    expect(
      formatPublicOrderNumber(new Date("2026-08-04T00:00:00Z"), 1001),
    ).toBe("B-1001");
  });
});

describe("order lifecycle", () => {
  it("allows only the three staff transitions in the MVP", () => {
    expect(isAllowedTransition("ordered", "ready")).toBe(true);
    expect(isAllowedTransition("ordered", "cancelled")).toBe(true);
    expect(isAllowedTransition("ready", "collected")).toBe(true);
    expect(isAllowedTransition("ready", "cancelled")).toBe(false);
    expect(isAllowedTransition("collected", "ready")).toBe(false);
  });

  it("trims valid descriptions, rejects invalid input, and expires after 24 hours", () => {
    expect(normalizeDescription("  Dvije pljeskavice  \n")).toBe(
      "Dvije pljeskavice",
    );
    expect(() => normalizeDescription("   \n ")).toThrow("Narudžba je prazna");
    expect(() => normalizeDescription("x".repeat(501))).toThrow(
      "najviše 500 znakova",
    );
    expect(orderExpiresAt("2026-08-07T10:00:00.000Z")).toBe(
      "2026-08-08T10:00:00.000Z",
    );
  });
});

describe("active queue", () => {
  const orders: QueueOrder[] = [
    { id: "ready", status: "ready", createdAt: "2026-08-07T10:00:00Z" },
    { id: "mine", status: "ordered", createdAt: "2026-08-07T10:03:00Z" },
    { id: "older", status: "ordered", createdAt: "2026-08-07T10:01:00Z" },
    { id: "collected", status: "collected", createdAt: "2026-08-07T09:59:00Z" },
  ];

  it("sorts active work oldest first and estimates only earlier ordered work", () => {
    expect(
      orders.filter((order) => order.status === "ordered" || order.status === "ready").sort(compareActiveOrders).map((order) => order.id),
    ).toEqual(["ready", "older", "mine"]);
    expect(estimateOrdersAhead(orders, "mine")).toBe(1);
  });
});

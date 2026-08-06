import { expect, test } from "@playwright/test";

test("staff can create, edit, advance, collect, and reopen a QR code", async ({ page }) => {
  await page.goto("/dashboard");

  const input = page.getByPlaceholder("Upišite narudžbu…");
  await input.fill("  Somun i jogurt  ");
  await expect(page.getByText(/18 \/ 500/)).toBeVisible();
  await page.getByRole("button", { name: "Dodaj narudžbu" }).click();
  await expect(page.getByRole("dialog")).toContainText("Narudžba");
  await page.getByRole("button", { name: "Gotovo" }).click();
  await expect(page.getByText("Somun i jogurt")).toBeVisible();

  await page.getByText("Pileći sendvič bez majoneze").click();
  await page.getByLabel("Opis narudžbe").fill("Pileći sendvič, bez majoneze");
  await page.getByRole("button", { name: "Sačuvaj izmjene" }).click();
  await expect(page.getByText("Pileći sendvič, bez majoneze")).toBeVisible();

  await page.getByRole("button", { name: "Prikaži QR kod za C-023" }).click();
  await expect(page.getByRole("dialog")).toContainText("C-023");
  await page.getByRole("button", { name: "Gotovo" }).click();

  await page.getByText("Mali ćevapi i sok").click();
  await page.getByRole("button", { name: "Označi kao preuzeto" }).click();
  await expect(page.getByText("Mali ćevapi i sok")).toHaveCount(0);
});

test("customer sees Aura progress, private-safe queue rows, and can refresh", async ({ page }) => {
  await page.goto("/track/demo");
  await expect(page.getByRole("heading", { name: "Pripremamo vašu narudžbu" })).toBeVisible();
  await expect(page.locator(".aura.aura-glow")).toBeVisible();
  await expect(page.getByText("Još otprilike 2 narudžbe prije vaše")).toBeVisible();
  await expect(page.getByText("C-024")).toHaveCount(2);
  await page.getByRole("button", { name: "Osvježi" }).click();
  await expect(page.getByText(/^Ažurirano /)).toBeVisible();
});

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

  await page.getByText("Pileći sendvič, bez majoneze").click();
  await page.getByRole("dialog").getByRole("button", { name: "Označi kao spremno" }).click();
  await expect(page.getByRole("button", { name: /C-023.*Spremno/ })).toBeVisible();

  await page.getByRole("button", { name: "Prikaži QR kod za C-023" }).click();
  await expect(page.getByRole("dialog")).toContainText("C-023");
  await page.getByRole("button", { name: "Gotovo" }).click();

  await page.getByText("Pileći sendvič, bez majoneze").click();
  await page.getByRole("button", { name: "Označi kao preuzeto" }).click();
  await expect(page.getByText("Pileći sendvič, bez majoneze")).toHaveCount(0);
});

test("customer sees only their Aura progress and the count ahead", async ({ page }) => {
  await page.goto("/track/demo");
  await expect(page.getByRole("heading", { name: "Pripremamo vašu narudžbu" })).toBeVisible();
  await expect(page.locator(".aura.text-primary")).toBeVisible();
  await expect(page.locator(".aura-glow")).toHaveCount(0);
  await expect(page.getByText("Narudžbi ispred vas")).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByText("C-024")).toHaveCount(1);
  for (const otherOrder of ["C-019", "C-021", "C-022", "C-023", "C-025"]) {
    await expect(page.getByText(otherOrder, { exact: true })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Osvježi" }).click();
  await expect(page.getByText(/^Ažurirano /)).toBeVisible();
});

test("production backend carries one order through staff and customer views", async ({ browser, page }) => {
  test.skip(
    !process.env.E2E_STAFF_EMAIL ||
      !process.env.E2E_STAFF_PASSWORD ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requires a provisioned Supabase location and E2E staff credentials.",
  );

  const description = `E2E narudžba ${crypto.randomUUID()}`;
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_STAFF_EMAIL!);
  await page.getByLabel("Lozinka").fill(process.env.E2E_STAFF_PASSWORD!);
  await page.getByRole("button", { name: "Prijavi se" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.context().setOffline(true);
  await expect(page.getByText("Nema veze. Izmjene su privremeno onemogućene.")).toBeVisible();
  await expect(page.getByPlaceholder("Upišite narudžbu…")).toBeDisabled();
  await page.context().setOffline(false);
  await expect(page.getByPlaceholder("Upišite narudžbu…")).toBeEnabled();

  await page.getByPlaceholder("Upišite narudžbu…").fill(description);
  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/staff/orders") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Dodaj narudžbu" }).click(),
  ]);
  expect(createResponse.ok()).toBe(true);
  const created = (await createResponse.json()) as { publicNumber: string; trackingToken: string };
  await page.getByRole("button", { name: "Gotovo" }).click();

  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await customer.goto(`/track/${created.trackingToken}`);
  await expect(customer.getByText(created.publicNumber, { exact: true })).toHaveCount(1);

  const compactRow = page.getByRole("button", { name: new RegExp(`^${created.publicNumber}`) });
  if (await compactRow.count()) {
    await compactRow.click();
  } else {
    await page.locator("article").filter({ hasText: created.publicNumber }).getByRole("button", { name: "Označi kao spremno" }).click();
  }
  await page.getByRole("dialog").getByRole("button", { name: "Označi kao spremno" }).click();
  await expect(customer.getByRole("heading", { name: "Vaša narudžba je spremna!" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: new RegExp(`^${created.publicNumber}`) }).click();
  await page.getByRole("button", { name: "Označi kao preuzeto" }).click();
  await expect(customer.getByRole("heading", { name: "Narudžba je preuzeta" })).toBeVisible({ timeout: 15_000 });
  await expect(customer.getByRole("heading", { name: "Spremne narudžbe" })).toHaveCount(0);
  await customerContext.close();
});

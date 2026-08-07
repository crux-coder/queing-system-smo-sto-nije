import { expect, test } from "@playwright/test";

test("staff can create, edit, cancel, advance, collect, and reopen a QR code", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.locator("header").getByText("Ćevabdžinica Kod Muje", { exact: true })).toBeVisible();
  await expect(page.locator("header").getByText("Samo Što Nije", { exact: true })).toHaveCount(0);
  await expect(page.locator("header .mask-squircle")).toBeVisible();
  await page.getByLabel("Promijeni sliku lokacije").setInputFiles({
    name: "lokacija.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.locator("header .mask-squircle img")).toBeVisible();

  const input = page.getByPlaceholder("Upišite narudžbu…");
  await input.fill("  Somun i jogurt  ");
  await expect(page.getByText(/18 \/ 500/)).toBeVisible();
  await page.getByRole("button", { name: "Dodaj narudžbu" }).click();
  await expect(page.getByRole("dialog")).toContainText("Narudžba");
  await page.locator(".modal-box").getByRole("button", { name: "Zatvori", exact: true }).click();
  await expect(page.getByText("Somun i jogurt")).toBeVisible();

  const featuredOrder = page.locator("article");
  const featuredOrderNumber = (await featuredOrder.locator("p").first().textContent())?.trim();
  expect(featuredOrderNumber).toMatch(/^C-\d+$/);
  await featuredOrder.getByRole("button", { name: "Označi kao spremno" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Otvori preuzimanje za ${featuredOrderNumber}` })).toBeVisible();

  await page.getByRole("button", { name: "Uredi narudžbu C-023" }).click();
  await page.getByLabel("Opis narudžbe").fill("Pileći sendvič, bez majoneze");
  await page.getByRole("button", { name: "Sačuvaj izmjene" }).click();
  await expect(page.getByText("Pileći sendvič, bez majoneze")).toBeVisible();

  const c23CompactReadyButton = page.getByRole("button", { name: "Označi C-023 kao spremno" });
  if (await c23CompactReadyButton.count()) {
    await c23CompactReadyButton.click();
  } else {
    await page.locator("article").filter({ hasText: "C-023" }).getByRole("button", { name: "Označi kao spremno" }).click();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Otvori preuzimanje za C-023" })).toBeVisible();

  await page.getByRole("button", { name: "Uredi narudžbu C-024" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Označi kao spremno" })).toHaveCount(0);
  await page.getByRole("button", { name: "Otkaži narudžbu" }).click();
  await expect(page.getByText("C-024", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Prikaži QR kod za C-023" }).click();
  await expect(page.getByRole("dialog")).toContainText("C-023");
  await page.locator(".modal-box").getByRole("button", { name: "Zatvori", exact: true }).click();

  await page.getByRole("button", { name: "Otvori preuzimanje za C-023" }).click();
  await page.getByRole("button", { name: "Označi kao preuzeto" }).click();
  await expect(page.getByText("Pileći sendvič, bez majoneze")).toHaveCount(0);
});

test("customer sees only their Aura progress and the count ahead", async ({ page }) => {
  await page.goto("/track/demo");
  await expect(page.locator("header").getByText("Ćevabdžinica Kod Muje", { exact: true })).toBeVisible();
  await expect(page.locator("header").getByText("Samo Što Nije", { exact: true })).toHaveCount(0);
  await expect(page.locator("header .mask-squircle")).toBeVisible();
  await expect(page.getByLabel("Promijeni sliku lokacije")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pripremamo vašu narudžbu" })).toBeVisible();
  await expect(page.locator(".aura.text-primary")).toBeVisible();
  await expect(page.locator(".aura-glow")).toHaveCount(0);
  await expect(page.getByText("Narudžbi ispred vas")).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByText("C-024")).toHaveCount(1);
  const progressSteps = page.getByRole("list", { name: "Napredak narudžbe" }).locator(".step");
  await expect(progressSteps.locator(".step-icon svg")).toHaveCount(3);
  const preparationConnectorColor = await progressSteps.nth(1).evaluate((step) => getComputedStyle(step, "::before").backgroundColor);
  const preparationIconColor = await progressSteps.nth(1).locator(".step-icon").evaluate((icon) => getComputedStyle(icon).backgroundColor);
  expect(preparationConnectorColor).toBe(preparationIconColor);
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
  await page.locator(".modal-box").getByRole("button", { name: "Zatvori", exact: true }).click();

  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await customer.goto(`/track/${created.trackingToken}`);
  await expect(customer.getByText(created.publicNumber, { exact: true })).toHaveCount(1);

  const compactReadyButton = page.getByRole("button", { name: `Označi ${created.publicNumber} kao spremno` });
  if (await compactReadyButton.count()) {
    await compactReadyButton.click();
  } else {
    await page.locator("article").filter({ hasText: created.publicNumber }).getByRole("button", { name: "Označi kao spremno" }).click();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(customer.getByRole("heading", { name: "Vaša narudžba je spremna!" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: `Otvori preuzimanje za ${created.publicNumber}` }).click();
  await page.getByRole("button", { name: "Označi kao preuzeto" }).click();
  await expect(customer.getByRole("heading", { name: "Narudžba je preuzeta" })).toBeVisible({ timeout: 15_000 });
  await expect(customer.getByRole("heading", { name: "Spremne narudžbe" })).toHaveCount(0);
  await customerContext.close();
});

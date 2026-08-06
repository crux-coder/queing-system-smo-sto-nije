import { chromium } from "@playwright/test";

const baseUrl = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 432, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "bs-BA",
});

for (const [route, path, readyText] of [
  ["/dashboard", "/private/tmp/samosto-staff-final.png", "Nova narudžba"],
  ["/track/demo", "/private/tmp/samosto-customer-final.png", "Pripremamo vašu narudžbu"],
]) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${route}`);
  await page.getByText(readyText, { exact: true }).first().waitFor();
  await page.screenshot({ path });
  await page.close();
}

await context.close();
await browser.close();

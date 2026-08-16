import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test("diagnose 400 on transaction create", async ({ page, context }) => {
  // Use relative paths so baseURL from playwright.config applies
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /Entrar no Painel/i }).click();
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });

  const declineCookies = page.getByRole("button", { name: "Recusar", exact: true });
  if (await declineCookies.isVisible().catch(() => false)) {
    await declineCookies.click();
  }

  const cookies = await context.cookies();
  const csrfCookie = cookies.find((c) => c.name === "csrf-token");
  const csrfToken = csrfCookie?.value || "";

  const accountsResp = await page.request.get(`/api/v1/accounts?_t=${Date.now()}`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
  });
  console.log("ACCOUNTS_STATUS:", accountsResp.status());
  const accountsData = await accountsResp.json();
  console.log("ACCOUNTS_BODY:", JSON.stringify(accountsData));

  const accounts = accountsData.data ?? accountsData;
  if (!accounts.length) {
    console.log("NO_ACCOUNTS_AVAILABLE");
    return;
  }

  const account = accounts[0];
  console.log("ACCOUNT_ID:", account.id);
  console.log("ACCOUNT_BALANCE:", account.balance);
  console.log("ACCOUNT_BALANCE_TYPE:", typeof account.balance);

  const txResp = await page.request.post(`/api/v1/transactions`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    data: {
      description: "Diag test expense",
      amount: 10.5,
      type: "EXPENSE",
      accountId: account.id,
      date: new Date().toISOString(),
      isFixed: false,
    },
  });
  console.log("CREATE_TX_STATUS:", txResp.status());
  const txBody = await txResp.json();
  console.log("CREATE_TX_BODY:", JSON.stringify(txBody));

  if (txResp.ok()) {
    const afterResp = await page.request.get(`/api/v1/accounts?_t=${Date.now()}`, {
      headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    });
    const afterData = await afterResp.json();
    const afterAccounts = afterData.data ?? afterData;
    const afterAccount = afterAccounts.find((a: { id: string }) => a.id === account.id);
    console.log("AFTER_BALANCE:", afterAccount?.balance);
  }
});
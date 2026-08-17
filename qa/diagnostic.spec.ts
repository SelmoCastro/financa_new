import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test("diagnose budget create and fetch", async ({ page, context }) => {
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

  // Get categories
  const catResp = await page.request.get(`/api/v1/categories?_t=${Date.now()}`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
  });
  const catData = await catResp.json();
  const categories = catData.data ?? catData;
  console.log("CATEGORIES_COUNT:", categories.length);
  console.log("FIRST_3_CATS:", JSON.stringify(categories.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name, type: c.type }))));

  // Get existing budgets
  const budgetResp = await page.request.get(`/api/v1/budgets?_t=${Date.now()}&year=2026&month=7`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
  });
  console.log("BUDGETS_STATUS:", budgetResp.status());
  const budgetData = await budgetResp.json();
  console.log("BUDGETS_BODY:", JSON.stringify(budgetData));

  // Find a category to use
  const expenseCat = categories.find((c: any) => c.type === "EXPENSE");
  if (!expenseCat) {
    console.log("NO_EXPENSE_CATEGORY");
    return;
  }
  console.log("USING_CATEGORY:", expenseCat.id, expenseCat.name);

  // Create a budget
  const createResp = await page.request.post(`/api/v1/budgets`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
    data: {
      categoryId: expenseCat.id,
      amount: 200,
    },
  });
  console.log("CREATE_BUDGET_STATUS:", createResp.status());
  const createBody = await createResp.json();
  console.log("CREATE_BUDGET_BODY:", JSON.stringify(createBody));

  // Fetch budgets again
  const afterResp = await page.request.get(`/api/v1/budgets?_t=${Date.now()}&year=2026&month=7`, {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
  });
  console.log("AFTER_BUDGETS_STATUS:", afterResp.status());
  const afterData = await afterResp.json();
  console.log("AFTER_BUDGETS_BODY:", JSON.stringify(afterData));
});

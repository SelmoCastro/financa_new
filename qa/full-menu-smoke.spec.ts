import { expect, test } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const menuLabels = [
  "Dashboard",
  "Contas",
  "Orçamentos",
  "Metas",
  "Faturas",
  "Linha do Tempo",
  "Recorrentes",
  "Extrato",
  "Configurações",
];

test.describe("Finanza full menu and transaction smoke", () => {
  test("visits every menu and keeps expense/history/dashboard consistent", async ({
    page,
  }) => {
    if (!email || !password) {
      if (process.env.CI) {
        throw new Error(
          "E2E_EMAIL and E2E_PASSWORD must be configured in GitHub Actions secrets",
        );
      }
      test.skip(true, "Requires E2E_EMAIL and E2E_PASSWORD when run locally");
    }
    const failedApiResponses: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 400) {
        failedApiResponses.push(
          `${response.status()} ${response.request().method()} ${response.url()}`,
        );
      }
    });
    const deleteMatchingTransactions = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const buttons = page
          .getByRole("button", { name: /Excluir: E2E despesa consistente/i })
          .filter({ visible: true });
        if (!(await buttons.count())) return;
        page.once("dialog", (dialog) => dialog.accept());
        await buttons.first().click();
        await page.waitForTimeout(500);
      }
      throw new Error("Could not clean all stale E2E transactions");
    };

    await page.goto("/login");
    if (await page.locator('input[type="email"]').count()) {
      await page.locator('input[type="email"]').fill(email!);
      await page.locator('input[type="password"]').fill(password!);
      await page.getByRole("button", { name: /Entrar no Painel/i }).click();
    }
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
    const declineCookies = page.getByRole("button", {
      name: "Recusar",
      exact: true,
    });
    if (await declineCookies.isVisible().catch(() => false)) {
      await declineCookies.click();
    }

    await page
      .locator("aside")
      .getByRole("button", { name: "Contas", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Minhas Contas" }),
    ).toBeVisible();
    const createAccount = page.getByRole("button", {
      name: "Criar Conta Agora",
      exact: true,
    });
    if (await createAccount.isVisible().catch(() => false)) {
      await createAccount.click();
      await page.locator("select").first().selectOption({ index: 0 });
      await page.locator('input[placeholder="0,00"]').fill("100000");
      await page
        .getByRole("button", { name: "Criar Conta", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: /Saldo Consolidado/i }),
      ).toBeVisible();
      await expect(createAccount).toHaveCount(0);
    }

    const accountResponse = await page.request.get(
      "/api/v1/accounts?_t=" + Date.now(),
    );
    expect(accountResponse.ok()).toBeTruthy();
    const accountPayload = await accountResponse.json();
    const qaAccounts = accountPayload.data ?? accountPayload;
    const csrfCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "csrf-token",
    );
    for (const account of qaAccounts) {
      const reconcileResponse = await page.request.post(
        `/api/v1/accounts/${account.id}/reconcile`,
        {
          headers: csrfCookie
            ? { "x-csrf-token": csrfCookie.value }
            : undefined,
        },
      );
      expect(reconcileResponse.ok()).toBeTruthy();
    }

    const qaAccount = qaAccounts[0];
    expect(qaAccount).toBeDefined();
    const startingAccountBalance = Number(qaAccount.balance);
    expect(Number.isFinite(startingAccountBalance)).toBeTruthy();

    for (const label of menuLabels) {
      const target = page
        .locator("aside")
        .getByRole("button", { name: label, exact: true })
        .first();
      if (await target.count()) {
        await target.click();
      } else {
        await page.getByText(label, { exact: true }).first().click();
      }
      await page.waitForTimeout(250);
    }

    await page
      .locator("aside")
      .getByRole("button", { name: "Extrato", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Extrato Detalhado" }),
    ).toBeVisible();
    await deleteMatchingTransactions();

    await page
      .locator("aside")
      .getByRole("button", { name: "Dashboard", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Novo Lançamento", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .locator('input[placeholder^="Ex: Aluguel"]')
      .fill("E2E despesa consistente");
    await page.locator('input[placeholder="0,00"]').fill("12345");
    const createTransactionResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/transactions") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Confirmar Despesa/i }).click();
    expect((await createTransactionResponse).status()).toBe(201);

    const afterExpenseResponse = await page.request.get(
      "/api/v1/accounts?_t=" + Date.now(),
    );
    expect(afterExpenseResponse.ok()).toBeTruthy();
    const afterExpenseAccounts = await afterExpenseResponse.json();
    const afterExpenseAccount = (
      afterExpenseAccounts.data ?? afterExpenseAccounts
    ).find((account: { id: string }) => account.id === qaAccount.id);
    expect(Number(afterExpenseAccount?.balance)).toBeCloseTo(
      startingAccountBalance - 123.45,
      2,
    );

    await page
      .locator("aside")
      .getByRole("button", { name: "Extrato", exact: true })
      .click();
    const created = page
      .getByText("E2E despesa consistente", { exact: true })
      .filter({ visible: true })
      .first();
    await expect(created).toBeVisible();
    await expect(
      page
        .getByText(/R\$\s*123,45/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    await page
      .locator("aside")
      .getByRole("button", { name: "Dashboard", exact: true })
      .click();
    await expect(
      page
        .getByText(/R\$\s*123,45/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    await page
      .locator("aside")
      .getByRole("button", { name: "Extrato", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Extrato Detalhado" }),
    ).toBeVisible();
    await deleteMatchingTransactions();

    await page
      .locator("aside")
      .getByRole("button", { name: "Dashboard", exact: true })
      .click();
    await expect(
      page
        .getByText("E2E despesa consistente", { exact: true })
        .filter({ visible: true }),
    ).toHaveCount(0);
    expect(failedApiResponses, failedApiResponses.join("\n")).toEqual([]);
  });
});

import { expect, test } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const menuLabels = [
  'Dashboard',
  'Contas',
  'Orçamentos',
  'Metas',
  'Faturas',
  'Linha do Tempo',
  'Fixos',
  'Histórico',
  'Configurações',
];

test.describe('Finanza full menu and transaction smoke', () => {
  test('visits every menu and keeps expense/history/dashboard consistent', async ({ page }) => {
    if (!email || !password) {
      if (process.env.CI) {
        throw new Error('E2E_EMAIL and E2E_PASSWORD must be configured in GitHub Actions secrets');
      }
      test.skip(true, 'Requires E2E_EMAIL and E2E_PASSWORD when run locally');
    }
    const failedApiResponses: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        failedApiResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    await page.goto('/login');
    if (await page.locator('input[type="email"]').count()) {
      await page.locator('input[type="email"]').fill(email!);
      await page.locator('input[type="password"]').fill(password!);
      await page.getByRole('button', { name: /Entrar no Painel/i }).click();
    }
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();

    for (const label of menuLabels) {
      const target = page.getByRole('button', { name: label, exact: true }).first();
      if (await target.count()) {
        await target.click();
      } else {
        await page.getByText(label, { exact: true }).first().click();
      }
      await page.waitForTimeout(250);
    }

    await page.getByRole('button', { name: /Novo Lançamento/i }).click();
    await page.locator('input[placeholder*="Aluguel"]').fill('E2E despesa consistente');
    await page.locator('input[placeholder="0,00"]').fill('12345');
    await page.getByRole('button', { name: /Confirmar Despesa/i }).click();

    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    const created = page.getByText('E2E despesa consistente', { exact: true }).first();
    await expect(created).toBeVisible();
    await expect(page.getByText(/R\$\s*123,45/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByText(/R\$\s*123,45/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Excluir: E2E despesa consistente/i }).click();
    await expect(page.getByText('E2E despesa consistente', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByText('E2E despesa consistente', { exact: true })).toHaveCount(0);
    expect(failedApiResponses, failedApiResponses.join('\n')).toEqual([]);
  });
});

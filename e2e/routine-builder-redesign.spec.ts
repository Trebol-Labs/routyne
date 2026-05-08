import { expect, test } from '@playwright/test';

const DEMO_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

test.describe('routine builder redesign', () => {
  test('toggles markdown import in the create flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /EMPIEZA AHORA|START NOW/i })).toBeVisible();

    await page.getByRole('button', { name: /Crear|Create/i }).first().click();

    await expect(page.locator('textarea')).toHaveCount(0);

    await page.getByRole('button', { name: /Mostrar Markdown|Show Markdown import/i }).click();
    await expect(page.locator('textarea')).toHaveCount(1);

    await page.getByRole('button', { name: /Ocultar Markdown|Hide Markdown import/i }).click();
    await expect(page.locator('textarea')).toHaveCount(0);
  });

  test('builds a routine visually and previews an exercise demo', async ({ page }, testInfo) => {
    await page.route(/\/api\/exercise-image\?id=.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: DEMO_GIF,
      });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /EMPIEZA AHORA|START NOW/i })).toBeVisible();

    await page.getByRole('button', { name: /Crear|Create/i }).first().click();
    await page.getByRole('button', { name: /Construir visualmente|Build visually/i }).click();

    await expect(page.getByRole('heading', { name: /Constructor de rutinas|Routine Builder/i })).toBeVisible();

    await page.getByPlaceholder(/Mi rutina|My routine/i).fill('Upper Push');

    const builderSearchButton = page.getByRole('button', { name: /Buscar en la biblioteca de ejercicios|Search the exercise library/i }).first();
    await builderSearchButton.click();

    if (testInfo.project.name === 'chromium-mobile') {
      await expect(page.getByRole('dialog', { name: /Buscar en la biblioteca de ejercicios|Search the exercise library/i })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /Buscar ejercicios|Exercise search/i })).toBeVisible();
    }

    const searchInput = page.locator(
      'input[placeholder*="Buscar ejercicios"]:visible, input[placeholder*="Search exercises"]:visible'
    ).first();
    await searchInput.fill('barbell pullover to press');

    const resultRow = page.locator('button:visible').filter({ hasText: /barbell pullover to press/i }).first();
    await expect(resultRow).toBeVisible();
    await resultRow.click();

    await expect(page.getByAltText(/barbell pullover to press demo/i)).toBeVisible();

    await page.locator('button:visible').filter({ hasText: /Add to|Añadir a/i }).first().click();

    if (testInfo.project.name === 'chromium-mobile') {
      await expect(page.getByRole('dialog', { name: /Buscar en la biblioteca de ejercicios|Search the exercise library/i })).toHaveCount(0);
    }

    await page.getByRole('button', { name: /Crear rutina|Create routine/i }).click();

    await expect(page.getByRole('heading', { name: 'Upper Push' })).toBeVisible();
  });
});

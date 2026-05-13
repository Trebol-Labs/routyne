import { expect, test, type Page } from '@playwright/test';

const DEMO_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

async function stubExerciseMedia(page: Page) {
  await page.route(/\/api\/exercise-image\?id=.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: DEMO_GIF,
    });
  });
}

async function openBuilder(page: Page) {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /EMPIEZA AHORA|START NOW/i })).toBeVisible();

  await page.getByRole('button', { name: /Crear|Create/i }).first().click();
  await page.getByRole('button', { name: /Construir visualmente|Build visually/i }).click();

  await expect(page.getByRole('heading', { name: /Constructor de rutinas|Routine Builder/i })).toBeVisible();
}

async function fillExerciseSearch(page: Page, value: string) {
  const searchInput = page.locator(
    'input[placeholder*="Buscar ejercicios"]:visible, input[placeholder*="Search exercises"]:visible'
  );
  await expect(searchInput).toHaveCount(1);
  await searchInput.fill(value);
}

function exactExerciseName(name: string): RegExp {
  return new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function exactExerciseButton(page: Page, name: string) {
  return page.locator('button:visible').filter({ has: page.getByText(exactExerciseName(name)) });
}

function exactExerciseRow(page: Page, name: string) {
  return exactExerciseButton(page, name).first().locator('xpath=../..');
}

async function chooseExercise(page: Page, name: string) {
  const resultRow = exactExerciseButton(page, name);
  await expect(resultRow).toHaveCount(1);
  await resultRow.click({ position: { x: 24, y: 12 }, force: true });
}

test.describe('routine builder redesign', () => {
  test.beforeEach(async ({ page }) => {
    await stubExerciseMedia(page);
  });

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

  test('desktop builder adds and replaces exercises from the embedded picker', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop embedded picker is covered once on the desktop project.');

    await openBuilder(page);
    await page.getByPlaceholder(/Mi rutina|My routine/i).fill('Upper Push');

    await fillExerciseSearch(page, 'barbell pullover to press');
    await chooseExercise(page, 'barbell pullover to press');

    await page.locator('[data-testid="exercise-search-commit"]:visible').click();
    await expect(exactExerciseButton(page, 'barbell pullover to press')).toHaveCount(2);

    const replaceButtons = exactExerciseRow(page, 'barbell pullover to press').getByRole('button', {
      name: /Search the exercise library|Buscar en la biblioteca de ejercicios/i,
    });
    await expect(replaceButtons.last()).toBeVisible();
    await replaceButtons.last().click();

    await fillExerciseSearch(page, 'dumbbell fly');
    await chooseExercise(page, 'dumbbell fly');

    await page.locator('[data-testid="exercise-search-commit"]:visible').click();
    await expect(exactExerciseButton(page, 'dumbbell fly')).toHaveCount(1);
  });

  test('mobile builder uses the sheet add flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile sheet coverage runs once on the mobile project.');

    await openBuilder(page);
    await page.getByPlaceholder(/Mi rutina|My routine/i).fill('Upper Push');

    await page.getByRole('button', { name: /Añadir ejercicio|Add exercise/i }).click();

    const searchDialog = page.getByRole('dialog', { name: /Buscar ejercicios|Exercise search/i });
    await expect(searchDialog).toBeVisible();

    await fillExerciseSearch(page, 'dumbbell fly');
    await chooseExercise(page, 'dumbbell fly');

    await page.getByRole('button', { name: /Add to|Añadir a/i }).click();
    await expect(searchDialog).toHaveCount(0);
    await expect(exactExerciseButton(page, 'dumbbell fly')).toHaveCount(1);
  });

  test('active session edit adds, replaces, and returns to the session on save', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Active session edit coverage runs once on the desktop project.');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /EMPIEZA AHORA|START NOW/i })).toBeVisible();

    await page.getByRole('button', { name: /Starting Strength/i }).click();
    await page.getByRole('button', { name: /INICIAR SESIÓN 1|START SESSION 1/i }).click();
    await expect(page.getByRole('button', { name: /Finish Workout/i })).toBeVisible();

    await page.getByRole('button', { name: /Editar sesión|Edit session/i }).click();
    await expect(page.getByRole('dialog', { name: /Editar sesión|Edit session/i })).toBeVisible();

    await page.getByRole('button', { name: /Añadir ejercicio|Add exercise/i }).click();
    const searchDialog = page.getByRole('dialog', { name: /Buscar ejercicios|Exercise search/i });
    await expect(searchDialog).toBeVisible();

    await fillExerciseSearch(page, 'dumbbell fly');
    await chooseExercise(page, 'dumbbell fly');
    await page.locator('[data-testid="exercise-search-commit"]:visible').click();

    await expect(page.getByRole('dialog', { name: /Editar sesión|Edit session/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: exactExerciseName('dumbbell fly') })).toHaveCount(1);

    await page.getByRole('button', { name: /Reemplazar ejercicio|Replace exercise/i }).first().click();
    await expect(searchDialog).toBeVisible();

    await fillExerciseSearch(page, 'barbell pullover to press');
    await chooseExercise(page, 'barbell pullover to press');
    await page.locator('[data-testid="exercise-search-commit"]:visible').click();

    await expect(page.getByRole('dialog', { name: /Editar sesión|Edit session/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: exactExerciseName('barbell pullover to press') })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: exactExerciseName('dumbbell fly') })).toHaveCount(1);

    await page.getByRole('button', { name: /Guardar cambios|Save changes/i }).click();

    await expect(page.getByRole('dialog', { name: /Editar sesión|Edit session/i })).toHaveCount(0);
    await expect(exactExerciseButton(page, 'barbell pullover to press')).toHaveCount(1);
    await expect(exactExerciseButton(page, 'dumbbell fly')).toHaveCount(1);
  });
});

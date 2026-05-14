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
  return page.locator('[data-testid="exercise-search-result"]').filter({
    has: page.getByText(exactExerciseName(name)),
  }).first();
}

function exactExerciseCard(page: Page, name: string) {
  return page.locator('section:visible').filter({ hasText: exactExerciseName(name) }).first();
}

async function chooseExercise(page: Page, name: string) {
  const resultRow = exactExerciseRow(page, name);
  await expect(resultRow).toHaveCount(1);
  await resultRow.click({ position: { x: 24, y: 12 }, force: true });
}

function searchCommitButton(page: Page) {
  return page.locator('[data-testid="exercise-search-commit"]:visible');
}

function searchPreviewPanel(page: Page) {
  return page.locator('[data-testid="exercise-search-preview"]:visible');
}

function mobileSelectedBar(page: Page) {
  return page.locator('[data-testid="exercise-search-mobile-bar"]:visible');
}

function searchResultsList(page: Page) {
  return page.locator('[data-testid="exercise-search-results"]:visible');
}

function editSessionSheet(page: Page) {
  return page.locator('[data-testid="edit-session-sheet"]:visible');
}

function editSessionSaveFooter(page: Page) {
  return page.locator('[data-testid="edit-session-save-footer"]:visible');
}

function bottomNav(page: Page) {
  return page.locator('nav[role="navigation"]').last();
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

    await expect(searchPreviewPanel(page)).toBeVisible();
    await expect(searchCommitButton(page)).toContainText(/barbell pullover to press/i);

    const embeddedCommitButton = searchCommitButton(page);
    const bottomNavBox = await bottomNav(page).boundingBox();
    const embeddedCommitBox = await embeddedCommitButton.boundingBox();
    expect(bottomNavBox).not.toBeNull();
    expect(embeddedCommitBox).not.toBeNull();
    expect(embeddedCommitBox!.y + embeddedCommitBox!.height).toBeLessThan(bottomNavBox!.y);

    await embeddedCommitButton.click();
    await expect(exactExerciseButton(page, 'barbell pullover to press')).toHaveCount(2);

    const replaceButtons = exactExerciseCard(page, 'barbell pullover to press').getByRole('button', {
      name: /Search the exercise library|Buscar en la biblioteca de ejercicios/i,
    });
    await expect(replaceButtons.last()).toBeVisible();
    await replaceButtons.last().click();

    await fillExerciseSearch(page, 'dumbbell fly');
    await chooseExercise(page, 'dumbbell fly');

    await expect(searchPreviewPanel(page)).toBeVisible();
    await expect(searchCommitButton(page)).toContainText(/dumbbell fly/i);

    const replacementCommitButton = searchCommitButton(page);
    const replacementCommitBox = await replacementCommitButton.boundingBox();
    expect(replacementCommitBox).not.toBeNull();
    expect(replacementCommitBox!.y + replacementCommitBox!.height).toBeLessThan(bottomNavBox!.y);

    await replacementCommitButton.click();
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

    const selectedRow = exactExerciseRow(page, 'dumbbell fly');
    await expect(selectedRow).toBeVisible();
    await expect(mobileSelectedBar(page)).toBeVisible();
    await expect(searchCommitButton(page)).toContainText(/dumbbell fly/i);

    const selectedRowBox = await selectedRow.boundingBox();
    const mobileBarBox = await mobileSelectedBar(page).boundingBox();
    expect(selectedRowBox).not.toBeNull();
    expect(mobileBarBox).not.toBeNull();
    expect(selectedRowBox!.y + selectedRowBox!.height).toBeLessThanOrEqual(mobileBarBox!.y);

    await page.getByRole('button', { name: /Ver detalles|Show details/i }).click();
    const previewPanel = searchPreviewPanel(page);
    await expect(previewPanel).toBeVisible();
    const previewBox = await previewPanel.boundingBox();
    expect(previewBox).not.toBeNull();
    expect(previewBox!.height).toBeLessThan(380);

    await searchCommitButton(page).click();
    await expect(searchDialog).toHaveCount(0);
    await expect(exactExerciseButton(page, 'dumbbell fly')).toHaveCount(1);
  });

  test('mobile active session replace flow keeps the edit footer clear of the nav', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile active-session coverage runs once on the mobile project.');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /EMPIEZA AHORA|START NOW/i })).toBeVisible();

    await page.getByRole('button', { name: /Starting Strength/i }).click();
    await page.getByRole('button', { name: /INICIAR SESIÓN 1|START SESSION 1/i }).click();
    await expect(page.getByRole('button', { name: /Finish Workout/i })).toBeVisible();

    await page.getByRole('button', { name: /Editar sesión|Edit session/i }).click();
    await expect(editSessionSheet(page)).toBeVisible();

    await page.getByRole('button', { name: /Reemplazar ejercicio|Replace exercise/i }).first().click();
    const searchDialog = page.getByRole('dialog', { name: /Buscar ejercicios|Exercise search/i });
    await expect(searchDialog).toBeVisible();

    await fillExerciseSearch(page, 'barbell pullover to press');
    await chooseExercise(page, 'barbell pullover to press');

    await expect(mobileSelectedBar(page)).toBeVisible();
    await expect(searchCommitButton(page)).toContainText(/barbell pullover to press/i);
    await expect(mobileSelectedBar(page).getByText(/Reemplazando|Replacing/i)).toBeVisible();

    await searchCommitButton(page).click();

    await expect(editSessionSheet(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: exactExerciseName('barbell pullover to press') })).toHaveCount(1);

    const footerBox = await editSessionSaveFooter(page).boundingBox();
    const navBox = await bottomNav(page).boundingBox();
    expect(footerBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(footerBox!.y + footerBox!.height).toBeLessThan(navBox!.y);
  });

  test('exercise search shows loading and empty states', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Search state coverage runs once on the desktop project.');

    await page.route(/\/api\/exercises\/browse.*/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    await openBuilder(page);

    await expect(searchPreviewPanel(page).getByText(/Cargando ejercicios|Loading exercises/i)).toBeVisible();
    await expect(searchResultsList(page)).toBeVisible();
    await expect(searchResultsList(page).getByText(/No se encontraron ejercicios|No exercises found/i)).toBeVisible();
  });

  test('exercise search shows the error state when browse fails', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Search state coverage runs once on the desktop project.');

    await page.route(/\/api\/exercises\/browse.*/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: 'failed',
      });
    });

    await openBuilder(page);

    await expect(searchResultsList(page).getByText(/No se pudieron cargar los ejercicios|Could not load exercises/i)).toBeVisible();
    await expect(searchResultsList(page).getByRole('button', { name: /Reintentar|Retry/i })).toBeVisible();
    await expect(searchPreviewPanel(page)).toBeVisible();
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

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

interface BackupJson {
  formatVersion?: unknown;
  exportedAt?: unknown;
  data?: {
    routines?: unknown;
    sessions?: unknown;
    exercises?: unknown;
    history?: unknown;
    profile?: unknown;
  };
}

test('landing loads and opens the app', async ({ page }) => {
  await page.goto('/landing');

  await expect(page.getByRole('heading', { name: /ENTRENA/i })).toBeVisible();
  await expect(page.getByText('routyne-nu.vercel.app')).toBeVisible();

  await page.getByRole('link', { name: /Abrir app/i }).first().click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /GET STARTED/i })).toBeVisible();
});

test('core workout flow records history, stats, and backup export', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Full app smoke runs once on the mobile project.');

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /GET STARTED/i })).toBeVisible();

  await page.getByRole('button', { name: /Starting Strength/i }).click();
  await expect(page.getByRole('heading', { name: /Starting Strength/i })).toBeVisible();

  await page.getByRole('button', { name: /START SESSION 1/i }).click();
  await expect(page.getByRole('button', { name: /Finish Workout/i })).toBeVisible();

  await page.getByRole('button', { name: /Set 1 target/i }).first().click();
  await expect(page.getByRole('dialog', { name: /Log set 1/i })).toBeVisible();

  const setInputs = page.getByRole('spinbutton');
  await setInputs.first().fill('8');
  await setInputs.nth(1).fill('60');
  await page.getByRole('button', { name: /Log Set/i }).click();
  await page.getByRole('button', { name: /Close rest timer/i }).click();

  await page.getByRole('button', { name: /Finish Workout/i }).click();
  await expect(page.getByText(/Workout Complete|New Personal Record/i)).toBeVisible();

  await page.getByRole('button', { name: /View History/i }).click();
  await expect(page.getByRole('heading', { name: /History/i })).toBeVisible();
  await expect(page.getByText(/Today/i)).toBeVisible();

  await page.getByRole('button', { name: 'Stats' }).click();
  await expect(page.getByRole('heading', { name: /Stats/i })).toBeVisible();
  await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Profile settings/i }).click();
  await expect(page.getByRole('dialog', { name: /Profile/i })).toBeVisible();

  const exportButton = page.getByRole('button', { name: /Export/i });
  await exportButton.scrollIntoViewIfNeeded();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (!downloadPath) throw new Error('Playwright did not expose the backup download path');

  const backup = JSON.parse(await readFile(downloadPath, 'utf8')) as BackupJson;
  expect(backup.formatVersion).toBe(1);
  expect(typeof backup.exportedAt).toBe('string');
  expect(Array.isArray(backup.data?.routines)).toBe(true);
  expect(Array.isArray(backup.data?.sessions)).toBe(true);
  expect(Array.isArray(backup.data?.exercises)).toBe(true);
  expect(Array.isArray(backup.data?.history)).toBe(true);
  expect((backup.data?.history as unknown[]).length).toBeGreaterThan(0);
});

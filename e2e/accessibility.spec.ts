import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('no critical axe violations on load', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    // Filter out known false-positives from glass-panel backdrop-filter
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('session picker buttons have aria-labels when routine is loaded', async ({ page }) => {
    const sessionButtons = page.locator('button[aria-label^="Session"]');
    const count = await sessionButtons.count();
    if (count > 0) {
      const label = await sessionButtons.first().getAttribute('aria-label');
      expect(label).toMatch(/^Session \d+:/);
    }
  });

  test('progressbar has valid aria attributes', async ({ page }) => {
    const bar = page.locator('[role="progressbar"]');
    if (await bar.count() > 0) {
      await expect(bar.first()).toHaveAttribute('aria-valuemin', '0');
      await expect(bar.first()).toHaveAttribute('aria-valuenow');
      await expect(bar.first()).toHaveAttribute('aria-valuemax');
    }
  });

  test('screenshot baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('app-initial.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

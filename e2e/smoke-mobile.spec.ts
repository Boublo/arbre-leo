import { expect, test } from '@playwright/test';

test.describe('fumée mobile', () => {
  test('la page de connexion s’affiche', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/e-mail|email/i)).toBeVisible();
  });

  test('la page d’inscription s’affiche', async ({ page }) => {
    await page.goto('/inscription');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('l’arbre redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/arbre');
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.url()).toContain('suite=%2Farbre');
  });

  test('la chronologie redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/chronologie');
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.url()).toContain('suite=%2Fchronologie');
  });
});

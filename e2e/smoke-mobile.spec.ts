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

  test('l’arbre conserve le focus dans suite sans session', async ({ page }) => {
    await page.goto('/arbre?personne=00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.url()).toContain('suite=%2Farbre%3Fpersonne%3D');
  });

  test('la chronologie redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/chronologie');
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.url()).toContain('suite=%2Fchronologie');
  });

  test('la page d’erreur générique s’affiche', async ({ page }) => {
    await page.goto('/erreur');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/impossible/i);
    await expect(page.getByRole('link', { name: /se connecter/i })).toBeVisible();
  });
});

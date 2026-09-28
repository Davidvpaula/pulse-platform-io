import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Never contact the real project while testing the production bundle.
  await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.addInitScript(() => sessionStorage.setItem('pulse.local-profile', 'admin'));
});

test('production does not accept the local profile selector', async ({ page }) => {
  await page.goto('/app/admin/dashboard');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByText('Qual dashboard vamos explorar?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Entrar como administrador' })).toHaveCount(0);
  await expect(page.getByText('Trocar dashboard', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation').getByText('Dashboard', { exact: true })).toHaveCount(0);
});

test('production does not expose the local editor', async ({ page }) => {
  await page.goto('/editor-visual');
  await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0);
  await expect(page.getByText('404', { exact: true })).toBeVisible();
});

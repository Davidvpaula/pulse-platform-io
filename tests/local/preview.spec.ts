import { test, expect } from '@playwright/test';

for (const [label, profile] of [['Usuário / cliente', 'paciente'], ['Administrador', 'admin'], ['Secretaria', 'secretaria'], ['Colaborador', 'colaborador'], ['Médico', 'medico'], ['Empresa', 'empresa']]) {
  test(`opens ${profile} without credentials or production requests`, async ({ page }) => {
    const errors: string[] = [];
    const remote: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/supabase\.co|lovable\./.test(request.url())) remote.push(request.url()); });
    await page.goto('/auth');
    await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${profile === 'secretaria' ? 'colaborador' : profile}/dashboard$`));
    await expect(page.getByText('Prévia local · sem dados reais')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
    expect(remote).toEqual([]);
    await page.reload();
    await expect(page.getByText('Prévia local · sem dados reais')).toBeVisible();
    await page.getByRole('link', { name: 'Trocar dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Qual dashboard vamos explorar?' })).toBeVisible();
  });
}
test('visual editor saves a local draft', async ({ page }) => {
  await page.goto('/editor-visual');
  await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByText('Rascunho salvo neste navegador.', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Visualizar rascunho' }).click();
  await expect(page.getByRole('heading', { name: 'Saúde a distância, cuidado próximo.' })).toBeVisible();
});

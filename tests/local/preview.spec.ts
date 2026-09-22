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

test('logout clears the selected preview profile', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('button', { name: /^Administrador/ }).click();
  await page.locator('header button[aria-haspopup="menu"]').click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await page.goto('/app/admin/dashboard');
  await expect(page).toHaveURL(/\/auth$/);
});

test('profile cards fit on a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: /^Usuário \/ cliente/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const [profile, path] of [
  ['admin', '/app/admin/usuarios'], ['paciente', '/app/paciente/agendamentos'],
  ['medico', '/app/medico/agenda'], ['empresa', '/app/empresa/funcionarios'],
  ['colaborador', '/app/colaborador/pacientes'],
]) {
  test(`loads secondary page ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(key => sessionStorage.setItem('pulse.local-profile', key), profile);
    await page.goto(path);
    await expect(page.getByText('Prévia local · sem dados reais')).toBeVisible();
    await expect(page.getByText('Carregando página…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Não foi possível carregar esta página', { exact: true })).toHaveCount(0);
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

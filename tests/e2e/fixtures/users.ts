// Credenciais dos seeds e2e_*. Senha plana — só vale para o ambiente de
// preview, alinhada com a migration `e2e_seed_users`.
export const E2E_PASSWORD = "E2eTest!2026";

export type E2eRole = "admin" | "medico" | "paciente" | "colaborador";

export const E2E_USERS: Record<
  E2eRole,
  { email: string; password: string; storage: string; appHome: string }
> = {
  admin: {
    email: "e2e_admin@pulse.test",
    password: E2E_PASSWORD,
    storage: ".storage/admin.json",
    appHome: "/app/admin/dashboard",
  },
  medico: {
    email: "e2e_medico@pulse.test",
    password: E2E_PASSWORD,
    storage: ".storage/medico.json",
    appHome: "/app/medico/dashboard",
  },
  paciente: {
    email: "e2e_paciente@pulse.test",
    password: E2E_PASSWORD,
    storage: ".storage/paciente.json",
    appHome: "/app/paciente/dashboard",
  },
  colaborador: {
    email: "e2e_colaborador@pulse.test",
    password: E2E_PASSWORD,
    storage: ".storage/colaborador.json",
    appHome: "/app/colaborador/dashboard",
  },
};

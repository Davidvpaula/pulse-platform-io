import { profiles, type ProfileKey } from '@/lib/profiles';
import { selectPreviewProfile } from '@/lib/local-preview';
import { Logo } from '@/components/Logo';

const cards: { key: ProfileKey; title: string; description: string }[] = [
  { key: 'paciente', title: 'Usuário / cliente', description: 'Consultas, documentos e plano de saúde' },
  { key: 'admin', title: 'Administrador', description: 'Gestão da plataforma e integrações' },
  { key: 'secretaria', title: 'Secretaria', description: 'Agenda, pacientes e atendimento' },
  { key: 'colaborador', title: 'Colaborador', description: 'Operação e trabalho da equipe' },
  { key: 'medico', title: 'Médico', description: 'Consultas, agenda e área profissional' },
  { key: 'empresa', title: 'Empresa', description: 'Colaboradores e gestão corporativa' },
];

export default function LocalPreviewLogin() {
  return <main className="min-h-screen bg-muted/40 px-6 py-12"><div className="mx-auto max-w-4xl">
    <Logo size="lg" />
    <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-primary">Ambiente de desenvolvimento</p>
    <h1 className="mt-3 text-4xl font-bold">Qual dashboard vamos explorar?</h1>
    <p className="my-5 text-muted-foreground">Entre sem e-mail ou senha. Esta prévia usa estados vazios e não acessa nem altera o banco real.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(card => <button key={card.key}
      className="rounded-xl border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      onClick={() => { const key = card.key === 'secretaria' ? 'colaborador' : card.key; selectPreviewProfile(key); window.location.assign(`${profiles[key].basePath}/dashboard`); }}>
      <h2 className="text-xl font-semibold">{card.title}</h2><p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
      <span className="mt-6 block font-medium text-primary">Abrir dashboard →</span>
    </button>)}</div>
    <a className="mt-8 inline-block text-primary underline" href="/">Visualizar site público</a>
    <a className="ml-6 mt-8 inline-block text-primary underline" href="/editor-visual">Editor visual · arrastar e soltar</a>
  </div></main>;
}

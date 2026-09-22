import { useState } from 'react';
import { Puck, Render, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Logo } from '@/components/Logo';

type Blocks = {
  Hero: { title: string; description: string; background: string };
  Text: { title: string; body: string };
  Highlight: { title: string; description: string };
};
const config: Config<Blocks> = {
  components: {
    Hero: {
      label: 'Destaque principal',
      fields: { title: { type: 'text', label: 'Título' }, description: { type: 'textarea', label: 'Descrição' }, background: { type: 'text', label: 'Cor de fundo' } },
      defaultProps: { title: 'Saúde a distância, cuidado próximo.', description: 'Cuidado para você, sua família e sua empresa.', background: '#154e56' },
      render: ({ title, description, background }) => <section style={{ background, padding: '72px 32px', color: 'white' }}><Logo variant="white" size="lg" /><h1 className="mt-10 text-4xl font-bold">{title}</h1><p className="mt-5 text-xl">{description}</p></section>,
    },
    Text: {
      label: 'Seção de texto',
      fields: { title: { type: 'text', label: 'Título' }, body: { type: 'textarea', label: 'Texto' } },
      defaultProps: { title: 'Cuidado em cada etapa', body: 'Edite este texto e organize as seções arrastando os blocos.' },
      render: ({ title, body }) => <section className="bg-white px-8 py-12"><h2 className="text-3xl font-bold">{title}</h2><p className="mt-4 whitespace-pre-wrap text-lg">{body}</p></section>,
    },
    Highlight: {
      label: 'Card de serviço',
      fields: { title: { type: 'text', label: 'Título' }, description: { type: 'textarea', label: 'Descrição' } },
      defaultProps: { title: 'Atendimento online', description: 'Apresente seu serviço aqui.' },
      render: ({ title, description }) => <section className="p-6"><div className="rounded-xl border bg-muted/40 p-8"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3">{description}</p></div></section>,
    },
  },
};
const KEY = 'pulse.visual-draft.v1';
const initial: Data<Blocks> = { root: { props: {} }, content: [
  { type: 'Hero', props: { id: 'hero', ...config.components.Hero.defaultProps! } },
  { type: 'Text', props: { id: 'text', ...config.components.Text.defaultProps! } },
] } as Data<Blocks>;

export default function VisualEditor() {
  const [data, setData] = useState<Data<Blocks>>(() => {
    try { const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return stored?.root && Array.isArray(stored.content) ? stored : initial; } catch { return initial; }
  });
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('Rascunho local: estas alterações não substituem o site público.');
  function save(next: Data<Blocks>) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); setData(next); setMessage('Rascunho salvo neste navegador. Exporte o JSON para guardar uma cópia.'); }
    catch { setMessage('Não foi possível salvar no navegador. Exporte o JSON para guardar uma cópia.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'pulse-design.json'; a.click(); URL.revokeObjectURL(url);
  }
  return <div><header className="flex flex-wrap items-center gap-4 border-b bg-white p-4">
    <a href="/auth" className="text-primary underline">Dashboards</a>
    <button onClick={() => setPreview(!preview)}>{preview ? 'Voltar ao editor' : 'Visualizar rascunho'}</button>
    <button onClick={() => save(data)}>Salvar rascunho</button><button onClick={download}>Exportar JSON</button>
    <p role="status" className="w-full text-sm text-muted-foreground">{message}</p>
  </header>{preview ? <Render config={config} data={data} /> : <Puck config={config} data={data} onChange={setData} onPublish={save} />}</div>;
}

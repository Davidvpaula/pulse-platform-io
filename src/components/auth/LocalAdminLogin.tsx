import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { LOCAL_BACKEND } from '@/lib/local-backend';

export default function LocalAdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function enter(role: 'admin' | 'medico') {
    if (!LOCAL_BACKEND || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: role === 'admin' ? import.meta.env.VITE_LOCAL_ADMIN_EMAIL : import.meta.env.VITE_LOCAL_MEDICO_EMAIL,
        password: role === 'admin' ? import.meta.env.VITE_LOCAL_ADMIN_PASSWORD : import.meta.env.VITE_LOCAL_MEDICO_PASSWORD,
      });
      if (error) throw error;
      window.location.assign(`/app/${role}/dashboard`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-6 p-8 py-16">
    <Logo size="lg" /><h1 className="text-3xl font-bold">Ambiente local</h1>
    <p>Gerencie os dados de teste. Alterações são salvas neste computador.</p>
    <p className="text-sm text-muted-foreground">Ambiente separado da produção. Integrações externas desativadas.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Button onClick={() => enter('admin')} disabled={busy}>Entrar como administrador</Button>
      <Button onClick={() => enter('medico')} disabled={busy}>Entrar como médico</Button>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </main>;
}

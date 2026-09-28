import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { LOCAL_BACKEND } from '@/lib/local-backend';

export default function LocalAdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function enter() {
    if (!LOCAL_BACKEND || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: import.meta.env.VITE_LOCAL_ADMIN_EMAIL,
        password: import.meta.env.VITE_LOCAL_ADMIN_PASSWORD,
      });
      if (error) throw error;
      window.location.assign('/app/admin/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-6 p-8 py-16">
    <Logo size="lg" /><h1 className="text-3xl font-bold">Admin local</h1>
    <p>Gerencie os dados de teste. Alterações são salvas neste computador.</p>
    <p className="text-sm text-muted-foreground">Ambiente separado da produção. Integrações externas desativadas.</p>
    <Button onClick={enter} disabled={busy}>{busy ? 'Entrando…' : 'Entrar como administrador'}</Button>
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </main>;
}

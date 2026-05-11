import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Loader2, FileText, MessageSquare, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const contatoSchema = z.object({
  nome: z.string().trim().max(120).optional(),
  sobrenome: z.string().trim().max(120).optional(),
  telefone: z.string().trim().max(40).optional(),
  email: z.string().trim().email("E-mail inválido").max(320),
});

const feedbackSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome").max(120),
  sobrenome: z.string().trim().min(1, "Informe seu sobrenome").max(120),
  email: z.string().trim().email("E-mail inválido").max(320),
  mensagem: z.string().trim().min(1, "Escreva sua mensagem").max(2000),
});

export default function FaqContactForms() {
  return (
    <div className="mt-16 space-y-10">
      <ContatoCard />
      <FeedbackCard />
    </div>
  );
}

function ContatoCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", sobrenome: "", telefone: "", email: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contatoSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Verifique os campos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("feedbacks_site").insert({
      tipo: "contato",
      nome: parsed.data.nome || null,
      sobrenome: parsed.data.sobrenome || null,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ nome: "", sobrenome: "", telefone: "", email: "" });
    toast({ title: "Mensagem enviada", description: "Em breve entraremos em contato." });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-elegant">
      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <h3 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          Confira os Termos de Uso e Condições
        </h3>
        <Button asChild variant="secondary" className="self-start sm:self-auto">
          <Link to="/termos">
            <FileText className="mr-2 h-4 w-4" /> Ler termos
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-4 mb-6 rounded-2xl bg-background p-6 text-foreground shadow-sm sm:mx-8 sm:mb-8 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="c-nome">
            <Input id="c-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" maxLength={120} />
          </Field>
          <Field label="Sobrenome" htmlFor="c-sobrenome">
            <Input id="c-sobrenome" value={form.sobrenome} onChange={(e) => setForm({ ...form, sobrenome: e.target.value })} placeholder="Sobrenome" maxLength={120} />
          </Field>
          <Field label="Telefone" htmlFor="c-telefone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="c-telefone" className="pl-9" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" maxLength={40} />
            </div>
          </Field>
          <Field label="E-mail *" htmlFor="c-email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="c-email" required type="email" className="pl-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" maxLength={320} />
            </div>
          </Field>
        </div>
        <div className="mt-6 flex justify-center">
          <Button type="submit" size="lg" className="min-w-[220px]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}

function FeedbackCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", sobrenome: "", email: "", mensagem: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = feedbackSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Verifique os campos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("feedbacks_site").insert({
      tipo: "feedback",
      nome: parsed.data.nome,
      sobrenome: parsed.data.sobrenome,
      email: parsed.data.email,
      mensagem: parsed.data.mensagem,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ nome: "", sobrenome: "", email: "", mensagem: "" });
    toast({ title: "Feedback enviado", description: "Obrigado! Sua mensagem foi recebida." });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center gap-3 bg-foreground px-6 py-5 text-background sm:px-8">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          Formulário de Feedback
        </h3>
      </header>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nome *" htmlFor="f-nome">
            <Input id="f-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Seu nome" maxLength={120} />
          </Field>
          <Field label="Sobrenome *" htmlFor="f-sobrenome">
            <Input id="f-sobrenome" required value={form.sobrenome} onChange={(e) => setForm({ ...form, sobrenome: e.target.value })} placeholder="Seu sobrenome" maxLength={120} />
          </Field>
          <Field label="E-mail *" htmlFor="f-email">
            <Input id="f-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" maxLength={320} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Mensagem *" htmlFor="f-mensagem">
            <Textarea
              id="f-mensagem"
              required
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              placeholder="Conte-nos sua experiência ou sugestão…"
              maxLength={2000}
              rows={5}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.mensagem.length}/2000</p>
          </Field>
        </div>
        <div className="mt-2 flex justify-center">
          <Button type="submit" size="lg" className="min-w-[220px]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

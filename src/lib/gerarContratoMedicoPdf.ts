import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { buscarTermoAtivo } from "@/lib/termos";

/** Remove tags HTML para extrair texto plano para o PDF. */
function htmlToText(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  // Quebras visuais para tags de bloco
  tmp.querySelectorAll("p,div,br,li,h1,h2,h3,h4,h5,h6,tr").forEach((el) => {
    el.appendChild(document.createTextNode("\n"));
  });
  return (tmp.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function gerarContratoMedicoPdf(medicoId: string): Promise<void> {
  const { data: medico, error } = await supabase
    .from("medicos")
    .select("id, nome, crm, crm_estado, especialidade")
    .eq("id", medicoId)
    .maybeSingle();
  if (error || !medico) throw new Error("Médico não encontrado");

  const termo = await buscarTermoAtivo("contrato_medico" as any);
  if (!termo) throw new Error("Nenhum contrato ativo publicado pela administração.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DA PLATAFORMA", margin, y);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
  doc.text(`Versão v${termo.versao}`, pw - margin, y, { align: "right" });
  y += 5;
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pw - margin, y, { align: "right" });
  doc.setTextColor(0);
  y += 6;
  doc.setDrawColor(200); doc.line(margin, y, pw - margin, y); y += 8;

  // Dados do médico
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Profissional", margin, y); y += 5;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${medico.nome ?? "—"}`, margin, y); y += 5;
  doc.text(`CRM: ${medico.crm ?? "—"} / ${medico.crm_estado ?? "—"}`, margin, y); y += 5;
  doc.text(`Especialidade: ${medico.especialidade ?? "—"}`, margin, y); y += 8;

  doc.setDrawColor(220); doc.line(margin, y, pw - margin, y); y += 6;

  // Título do termo
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  const tituloLines = doc.splitTextToSize(termo.titulo, pw - margin * 2);
  doc.text(tituloLines, margin, y); y += tituloLines.length * 6 + 2;

  // Conteúdo
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  const texto = htmlToText(termo.conteudo);
  const linhas = doc.splitTextToSize(texto, pw - margin * 2) as string[];
  for (const ln of linhas) {
    if (y > ph - 30) { doc.addPage(); y = 20; }
    doc.text(ln, margin, y);
    y += 5;
  }

  // Bloco assinatura
  if (y > ph - 50) { doc.addPage(); y = 20; }
  y += 12;
  doc.setDrawColor(0); doc.line(margin, y, margin + 80, y);
  doc.setFontSize(9); doc.text("Assinatura do profissional", margin, y + 5);
  doc.line(pw - margin - 80, y, pw - margin, y);
  doc.text("Data", pw - margin - 80, y + 5);

  doc.save(`contrato_${(medico.nome ?? "medico").replace(/\s+/g, "_")}_v${termo.versao}.pdf`);
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export type FaturaParaPdf = {
  id: string;
  razao_social: string;
  competencia_label: string;
  vencimento: string;
  valor_total_centavos: number;
  qtd_funcionarios: number;
  qtd_consultas: number;
  status: string;
  pago_em: string | null;
  observacoes: string | null;
  detalhamento: any;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  em_aberto: "Em aberto",
  paga: "Paga",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

export function gerarFaturaPdf(f: FaturaParaPdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ─── Header ───
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA B2B", margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`ID: ${f.id}`, pw - margin, y, { align: "right" });
  y += 4;
  doc.text(`Emitido em: ${fmtDate(f.created_at)}`, pw - margin, y, { align: "right" });
  doc.setTextColor(0);

  // ─── Divider ───
  y += 6;
  doc.setDrawColor(200);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  // ─── Info grid ───
  doc.setFontSize(10);
  const col1 = margin;
  const col2 = pw / 2 + 5;

  const infoRows: [string, string, string, string][] = [
    ["Empresa", f.razao_social, "Competência", f.competencia_label],
    ["Status", STATUS_LABEL[f.status] ?? f.status, "Vencimento", fmtDate(f.vencimento)],
    ["Funcionários", String(f.qtd_funcionarios), "Consultas", String(f.qtd_consultas)],
    ["Pago em", fmtDate(f.pago_em), "", ""],
  ];

  for (const [lbl1, val1, lbl2, val2] of infoRows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(lbl1 + ":", col1, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(val1, col1 + 30, y);
    if (lbl2) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(lbl2 + ":", col2, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(val2, col2 + 30, y);
    }
    y += 7;
  }

  // ─── Valor destaque ───
  y += 4;
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pw - margin * 2, 16, 3, 3, "FD");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("VALOR TOTAL", margin + 6, y + 10);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(brl(f.valor_total_centavos), pw - margin - 6, y + 11, { align: "right" });
  y += 24;

  // ─── Detalhamento (tabela) ───
  if (f.detalhamento && typeof f.detalhamento === "object") {
    const entries = Array.isArray(f.detalhamento) ? f.detalhamento : Object.entries(f.detalhamento);

    if (entries.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhamento", margin, y);
      y += 4;

      if (Array.isArray(f.detalhamento) && f.detalhamento.length > 0 && typeof f.detalhamento[0] === "object") {
        // Array of objects → table
        const keys = Object.keys(f.detalhamento[0]);
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [keys],
          body: f.detalhamento.map((row: any) => keys.map(k => String(row[k] ?? ""))),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [60, 60, 60] },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 20;
      } else {
        // Key-value pairs
        const kvRows = Array.isArray(entries)
          ? entries.map((e: any) => (Array.isArray(e) ? e.map(String) : [String(e)]))
          : [];
        if (kvRows.length > 0 && kvRows[0].length >= 2) {
          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [["Campo", "Valor"]],
            body: kvRows.map(r => [r[0], r[1]]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [60, 60, 60] },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        }
      }
      y += 6;
    }
  }

  // ─── Observações ───
  if (f.observacoes) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(f.observacoes, pw - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 6;
  }

  // ─── Footer ───
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(200);
  doc.line(margin, footerY - 4, pw - margin, footerY - 4);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    "Documento gerado automaticamente pela plataforma. Não possui valor fiscal.",
    pw / 2,
    footerY,
    { align: "center" },
  );

  // ─── Download ───
  const nomeArq = `fatura-${f.razao_social.replace(/\s+/g, "_").substring(0, 30)}-${f.competencia_label.replace("/", "-")}.pdf`;
  doc.save(nomeArq);
}

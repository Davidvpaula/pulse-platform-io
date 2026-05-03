import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, num, pct } from "@/lib/relatorios/utils";

export type DadosPdfGeral = {
  periodo: { inicio: string; fim: string };
  executivo?: Record<string, any> | null;
  clinica?: Record<string, any> | null;
  financeiro?: Record<string, any> | null;
};

function formatDataBR(s: string) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function secao(doc: jsPDF, txt: string, x: number, y: number) {
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(txt, x, y);
}

export function gerarPdfGeral(d: DadosPdfGeral) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 40;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 100, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório Geral — Visão Executiva", m, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período: ${formatDataBR(d.periodo.inicio)} a ${formatDataBR(d.periodo.fim)}`, m, 68);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, m, 84);

  doc.setTextColor(15, 23, 42);
  let y = 120;

  const ensureSpace = (need = 120) => {
    if (y > H - need) { doc.addPage(); y = m; }
  };

  // --- Executivo ---
  if (d.executivo) {
    const ex = d.executivo;
    secao(doc, "Indicadores Executivos", m, y);
    y += 6;
    const rows = [
      ["Total de consultas", num(ex.total_consultas)],
      ["Concluídas", num(ex.concluidas)],
      ["Canceladas", num(ex.canceladas)],
      ["No-show", num(ex.no_show)],
      ["Taxa no-show", pct(ex.taxa_no_show_pct)],
      ["Receita bruta", brl(ex.receita_bruta_centavos)],
      ["Ticket médio", brl(ex.ticket_medio_centavos)],
      ["Novos pacientes", num(ex.novos_pacientes)],
      ["Taxa conversão leads", pct(ex.taxa_conversao_pct)],
    ];
    autoTable(doc, {
      startY: y + 6,
      head: [["Indicador", "Valor"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // --- Clínica ---
  if (d.clinica) {
    const cl = d.clinica;
    ensureSpace(160);
    secao(doc, "Operação Clínica", m, y);
    y += 6;

    const espec = (cl.por_especialidade || []) as any[];
    if (espec.length) {
      autoTable(doc, {
        startY: y + 6,
        head: [["Especialidade", "Consultas", "Concluídas", "Receita"]],
        body: espec.slice(0, 15).map((e: any) => [
          e.especialidade ?? "—", num(e.total), num(e.concluidas), brl(e.receita_centavos),
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        margin: { left: m, right: m },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }

    const kpisClin = [
      ["Taxa de retorno", pct(cl.taxa_retorno_pct)],
      ["Tempo médio de espera", `${num(cl.tempo_medio_espera_min)} min`],
    ];
    if (kpisClin.some(([, v]) => v && v !== "0" && v !== "0 min")) {
      ensureSpace();
      autoTable(doc, {
        startY: y,
        head: [["Indicador Clínico", "Valor"]],
        body: kpisClin,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        margin: { left: m, right: m },
      });
      y = (doc as any).lastAutoTable.finalY + 24;
    }
  }

  // --- Financeiro ---
  if (d.financeiro) {
    const fin = d.financeiro;
    ensureSpace(160);
    secao(doc, "Financeiro", m, y);
    y += 6;
    const rows = [
      ["Receita bruta", brl(fin.receita_bruta_centavos)],
      ["Receita líquida", brl(fin.receita_liquida_centavos)],
      ["Plataforma", brl(fin.plataforma_centavos)],
      ["Médicos", brl(fin.medicos_centavos)],
      ["Comissão média", pct(fin.comissao_media_pct)],
      ["Taxa gateway", brl(fin.taxa_gateway_total_centavos)],
      ["Reembolsos", brl(fin.reembolsos_centavos)],
      ["Pagamentos pendentes", brl(fin.pendentes_centavos)],
      ["Assinaturas ativas", num(fin.assinaturas_ativas)],
      ["Receita recorrente", brl(fin.receita_recorrente_centavos)],
    ];
    autoTable(doc, {
      startY: y + 6,
      head: [["Indicador", "Valor"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 18;

    const metodos = (fin.por_metodo || []) as any[];
    if (metodos.length) {
      ensureSpace();
      autoTable(doc, {
        startY: y,
        head: [["Método", "Qtd", "Valor"]],
        body: metodos.map((r: any) => [r.metodo, num(r.total), brl(r.valor_centavos)]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        margin: { left: m, right: m },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    }
  }

  // Footer
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pages}  ·  Relatório gerado automaticamente`, m, H - 16);
  }

  doc.save(`relatorio-geral-${d.periodo.inicio}-a-${d.periodo.fim}.pdf`);
}

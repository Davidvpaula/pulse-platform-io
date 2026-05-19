import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, num } from "@/lib/relatorios/utils";

export type DadosRelatorioPdf = {
  periodo: { inicio: string; fim: string };
  comparativo?: { inicio: string; fim: string; modo: string } | null;
  kpis: any;
  kpis_anterior?: any;
  por_medico?: any[];
  por_especialidade?: any[];
  por_modalidade?: any[];
  por_metodo?: any[];
  por_canal?: any[];
};

function delta(now: number, prev: number): string {
  if (!prev) return now > 0 ? "+100%" : "—";
  const v = ((now - prev) / prev) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function formatDataBR(s: string) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function secaoTitulo(doc: jsPDF, txt: string, x: number, y: number) {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(txt, x, y);
}

export function gerarPdfFinanceiro(
  d: DadosRelatorioPdf,
  opts?: { titulo?: string; subtitulo?: string },
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 110, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(opts?.titulo ?? "Relatório Financeiro", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts?.subtitulo ?? "Nova Saúde — Snapshots imutáveis", margin, 70);
  doc.setFontSize(9);
  doc.text(
    `Período: ${formatDataBR(d.periodo.inicio)} a ${formatDataBR(d.periodo.fim)}`,
    margin,
    90,
  );
  if (d.comparativo) {
    doc.text(
      `Comparado com: ${formatDataBR(d.comparativo.inicio)} a ${formatDataBR(d.comparativo.fim)} (${d.comparativo.modo === "ano_anterior" ? "ano anterior" : "período anterior"})`,
      margin,
      104,
    );
  }
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, W - margin - 200, 90);

  doc.setTextColor(15, 23, 42);
  let y = 140;

  // Indicadores
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores", margin, y);
  y += 6;

  const k = d.kpis || {};
  const kp = d.kpis_anterior || {};
  const kpis: { label: string; atual: string; anterior?: string; delta?: string }[] = [
    { label: "Receita bruta", atual: brl(k.receita_bruta_centavos), anterior: brl(kp.receita_bruta_centavos), delta: delta(Number(k.receita_bruta_centavos || 0), Number(kp.receita_bruta_centavos || 0)) },
    { label: "Receita líquida", atual: brl(k.receita_liquida_centavos), anterior: brl(kp.receita_liquida_centavos), delta: delta(Number(k.receita_liquida_centavos || 0), Number(kp.receita_liquida_centavos || 0)) },
    { label: "Comissão plataforma", atual: brl(k.comissao_plataforma_centavos), anterior: brl(kp.comissao_plataforma_centavos), delta: delta(Number(k.comissao_plataforma_centavos || 0), Number(kp.comissao_plataforma_centavos || 0)) },
    { label: "Repasse médicos", atual: brl(k.repasse_medicos_centavos), anterior: brl(kp.repasse_medicos_centavos), delta: delta(Number(k.repasse_medicos_centavos || 0), Number(kp.repasse_medicos_centavos || 0)) },
    { label: "Taxas (gateway+imposto)", atual: brl((k.taxa_gateway_centavos || 0) + (k.taxa_imposto_centavos || 0)) },
    { label: "Reembolsos", atual: brl(k.reembolsos_centavos) },
    { label: "Consultas concluídas", atual: num(k.consultas_concluidas), anterior: num(kp.consultas_concluidas), delta: delta(Number(k.consultas_concluidas || 0), Number(kp.consultas_concluidas || 0)) },
    { label: "Ticket médio", atual: brl(k.ticket_medio_centavos), anterior: brl(kp.ticket_medio_centavos), delta: delta(Number(k.ticket_medio_centavos || 0), Number(kp.ticket_medio_centavos || 0)) },
  ];

  autoTable(doc, {
    startY: y + 6,
    head: [["Indicador", "Período atual", "Comparativo", "Variação"]],
    body: kpis.map((r) => [r.label, r.atual, r.anterior ?? "—", r.delta ?? "—"]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  const ensureSpace = (need = 120) => {
    if (y > H - need) { doc.addPage(); y = margin; }
  };

  if (d.por_medico && d.por_medico.length) {
    ensureSpace(160);
    secaoTitulo(doc, "Por médico (top 25)", margin, y);
    autoTable(doc, {
      startY: y + 6,
      head: [["Médico", "Consultas", "Receita", "Comissão", "Repasse"]],
      body: d.por_medico.slice(0, 25).map((m) => [
        m.medico_nome || "—",
        num(m.consultas),
        brl(m.receita_centavos),
        brl(m.comissao_centavos),
        brl(m.repasse_centavos),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  const triplas: [string, any[] | undefined, string, string][] = [
    ["Por especialidade", d.por_especialidade, "especialidade", "Especialidade"],
    ["Por modalidade", d.por_modalidade, "modalidade", "Modalidade"],
    ["Por método de pagamento", d.por_metodo, "metodo", "Método"],
    ["Por canal de origem", d.por_canal, "canal", "Canal"],
  ];

  for (const [titulo, arr, campo, header] of triplas) {
    if (!arr || !arr.length) continue;
    ensureSpace(120);
    secaoTitulo(doc, titulo, margin, y);
    autoTable(doc, {
      startY: y + 6,
      head: [[header, "Qtd", "Receita"]],
      body: arr.map((r) => [
        String(r[campo] ?? "—").replace(/_/g, " "),
        num(r.consultas ?? r.pagamentos ?? 0),
        brl(r.receita_centavos),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Rodapé com paginação
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pages}  ·  Nova Saúde  ·  Documento gerado automaticamente`,
      margin,
      H - 16,
    );
  }

  doc.save(`relatorio-financeiro-${d.periodo.inicio}-a-${d.periodo.fim}.pdf`);
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EventoAuditoria, FiltrosAuditoria } from "./typesAuditoria";

export type DadosRelatorioAuditoriaPdf = {
  filtros: FiltrosAuditoria;
  dashboard: any;
  eventos: EventoAuditoria[];
  totalEventos: number;
};

function formatDataBR(s: string) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function dataHora(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const LIMITE_LINHAS_PDF = 1000;

export function gerarPdfAuditoria(d: DadosRelatorioAuditoriaPdf) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 32;

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Auditoria", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Nova Saúde — Trilha de eventos sensíveis", margin, 58);
  doc.text(
    `Período: ${formatDataBR(d.filtros.inicio)} a ${formatDataBR(d.filtros.fim)}`,
    margin,
    74,
  );
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, W - margin - 220, 58);
  doc.text(`Total no período: ${d.totalEventos}`, W - margin - 220, 74);

  doc.setTextColor(15, 23, 42);
  let y = 110;

  // Filtros aplicados
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Filtros aplicados", margin, y);
  y += 4;
  const filtrosLinhas: string[][] = [
    ["Módulo", d.filtros.modulo === "todos" ? "Todos" : d.filtros.modulo],
    ["Severidade", d.filtros.risco === "todos" ? "Todas" : d.filtros.risco],
    ["Origem", d.filtros.origem === "todas" ? "Todas" : d.filtros.origem],
    ["Usuário (ator)", d.filtros.actor || "—"],
    ["Entidade ID", d.filtros.entidadeId || "—"],
    ["Ação contém", d.filtros.acao || "—"],
    ["Busca livre", d.filtros.busca || "—"],
  ];
  autoTable(doc, {
    startY: y + 4,
    body: filtrosLinhas,
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 } },
    theme: "plain",
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // KPIs — adaptado ao formato da RPC auditoria_dashboard
  const k = d.dashboard || {};
  const risco = k.por_risco || {};
  const origem = k.por_origem || {};
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Indicadores do período", margin, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Total", "Últimas 24h", "Críticos", "Altos", "Médios", "Baixos", "Manual", "Sistema", "Revisados", "Não revisados"]],
    body: [[
      k.total ?? 0, k.ultimas_24h ?? 0,
      risco.critico ?? 0, risco.alto ?? 0, risco.medio ?? 0, risco.baixo ?? 0,
      origem.manual ?? 0, origem.sistema ?? 0,
      k.revisados ?? 0, k.nao_revisados ?? 0,
    ].map((v) => String(v))],
    styles: { fontSize: 9, cellPadding: 5, halign: "center" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  // Distribuição por módulo
  const porModulo = k.por_modulo || {};
  const moduloEntries = Object.entries(porModulo);
  if (moduloEntries.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Distribuição por módulo", margin, y);
    autoTable(doc, {
      startY: y + 6,
      head: [["Módulo", "Eventos"]],
      body: moduloEntries.map(([mod, cnt]) => [mod, String(cnt)]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Top atores
  if (Array.isArray(k.top_atores) && k.top_atores.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Top usuários por volume de eventos", margin, y);
    autoTable(doc, {
      startY: y + 6,
      head: [["Usuário", "Eventos"]],
      body: k.top_atores.slice(0, 10).map((a: any) => [a.actor_nome || "—", String(a.total)]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Tabela principal de eventos
  doc.addPage();
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Eventos detalhados", margin, y);

  const linhas = d.eventos.slice(0, LIMITE_LINHAS_PDF);
  const truncado = d.eventos.length > LIMITE_LINHAS_PDF;

  autoTable(doc, {
    startY: y + 8,
    head: [["Data/hora", "Sev.", "Módulo", "Ação", "Ator", "Entidade", "Campo", "Antes → Depois", "Origem"]],
    body: linhas.map((e) => [
      dataHora(e.created_at),
      (e.risco || "").toUpperCase(),
      e.modulo || "",
      trunc(e.acao, 36),
      trunc(e.actor_nome, 26),
      trunc(`${e.entidade_tipo || ""}${e.entidade_id ? ":" + String(e.entidade_id).slice(0, 8) : ""}`, 28),
      trunc(e.campo, 18),
      trunc(`${e.valor_anterior || ""} → ${e.valor_novo || ""}`, 50),
      e.origem || "",
    ]),
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw || "").toLowerCase();
        if (v === "critico") data.cell.styles.textColor = [185, 28, 28];
        else if (v === "alto") data.cell.styles.textColor = [180, 83, 9];
        else if (v === "medio") data.cell.styles.textColor = [29, 78, 216];
      }
    },
  });

  if (truncado) {
    const yEnd = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Atenção: lista truncada em ${LIMITE_LINHAS_PDF} eventos. Use o CSV para exportação completa (${d.eventos.length} no total).`,
      margin,
      yEnd,
    );
  }

  // Rodapé com paginação
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pages}  ·  Nova Saúde  ·  Documento gerado automaticamente — ${new Date().toISOString()}`,
      margin,
      H - 14,
    );
  }

  doc.save(`relatorio-auditoria-${d.filtros.inicio}-a-${d.filtros.fim}.pdf`);
}

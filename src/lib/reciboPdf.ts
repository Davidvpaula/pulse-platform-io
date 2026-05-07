import jsPDF from "jspdf";
import { formatBRL } from "@/lib/format";

export interface DadosRecibo {
  pagamentoId: string;
  consultaId: string;
  valorCentavos: number;
  metodo: string;
  paidAt: string | null;
  createdAt: string;
  medicoNome: string;
  especialidadeNome: string;
  consultaData: string | null;
  modalidade: string;
  pacienteNome: string;
  /** Nome do dependente atendido (quando diferente do titular) */
  pacienteAtendidoNome?: string | null;
  cupom?: { codigo: string; desconto_centavos: number; valor_original_centavos: number } | null;
}

const metodoLabel: Record<string, string> = {
  cartao: "Cartão de Crédito/Débito",
  pix: "PIX",
  boleto: "Boleto Bancário",
  simulado: "Sandbox (teste)",
};

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDataCurta(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export function gerarReciboPdf(d: DadosRecibo) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 50;

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Recibo de Pagamento", m, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Lasmar Telemed", m, 65);
  doc.setFontSize(9);
  doc.text(`Emitido em: ${fmtData(new Date().toISOString())}`, W - m - 200, 65);

  // Status badge
  let y = 120;
  doc.setFillColor(22, 163, 74); // green
  doc.roundedRect(m, y, 120, 26, 6, 6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("✓ PAGO", m + 14, y + 17);

  // Valor destaque
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(formatBRL(d.valorCentavos), m + 150, y + 20);

  y += 50;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(m, y, W - m, y);
  y += 20;

  // Section: Consulta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Dados da Consulta", m, y);
  y += 20;

  const label = (l: string, v: string, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(l, m, yy);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(v, m + 140, yy);
  };

  label("Paciente", d.pacienteNome || "—", y);
  y += 18;
  label("Profissional", d.medicoNome, y);
  y += 18;
  label("Especialidade", d.especialidadeNome, y);
  y += 18;
  label("Data da consulta", fmtDataCurta(d.consultaData), y);
  y += 18;
  label("Modalidade", d.modalidade, y);
  y += 30;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(m, y, W - m, y);
  y += 20;

  // Section: Pagamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Dados do Pagamento", m, y);
  y += 20;

  if (d.cupom) {
    label("Subtotal", formatBRL(d.cupom.valor_original_centavos), y);
    y += 18;
    label(`Cupom (${d.cupom.codigo})`, `- ${formatBRL(d.cupom.desconto_centavos)}`, y);
    y += 18;
  }

  label("Valor total", formatBRL(d.valorCentavos), y);
  y += 18;
  label("Método", metodoLabel[d.metodo] ?? d.metodo, y);
  y += 18;
  label("Pago em", fmtData(d.paidAt), y);
  y += 30;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(m, y, W - m, y);
  y += 20;

  // IDs
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Identificadores", m, y);
  y += 16;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Pagamento: ${d.pagamentoId}`, m, y);
  y += 14;
  doc.text(`Consulta:  ${d.consultaId}`, m, y);
  y += 30;

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(m, H - 60, W - m, H - 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Este documento foi gerado automaticamente pela plataforma Lasmar Telemed e possui validade fiscal.",
    m,
    H - 40,
  );
  doc.text(
    "Em caso de dúvidas, entre em contato pelo suporte da plataforma.",
    m,
    H - 28,
  );

  doc.save(`recibo-${d.pagamentoId.slice(0, 8)}.pdf`);
}

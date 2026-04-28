import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5531999999999"; // mock — substituir pelo real
const DEFAULT_MSG = "Olá, preciso de ajuda com minha consulta";

export function whatsappUrl(message = DEFAULT_MSG, phone = WHATSAPP_NUMBER) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function FloatingWhatsApp({ message }: { message?: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-semibold text-success-foreground shadow-lg shadow-success/30 transition hover:scale-105 hover:shadow-xl"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Falar no WhatsApp</span>
    </a>
  );
}

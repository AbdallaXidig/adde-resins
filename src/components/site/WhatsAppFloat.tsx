import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { getSettings, whatsappLink } from "@/lib/settings";

export async function WhatsAppFloat() {
  const t = await getTranslations("common");
  const s = await getSettings();
  return (
    <a
      href={whatsappLink(s.whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("chatWhatsapp")}
      className="fixed bottom-5 end-5 z-30 grid size-14 place-items-center rounded-full bg-[#128c4b] text-white shadow-lift transition-transform hover:scale-105"
    >
      <MessageCircle size={26} aria-hidden />
    </a>
  );
}

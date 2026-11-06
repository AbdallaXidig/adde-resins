"use client";
import { MessageCircle, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function QuotationActions({ whatsapp, message }: { whatsapp: string; message: string }) {
  const t = useTranslations("quotation");
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" onClick={() => window.print()} className="btn btn-primary"><Printer size={18} aria-hidden />{t("print")}</button>
      <a className="btn btn-whatsapp" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={18} aria-hidden />{t("whatsapp")}
      </a>
      <Link href="/products" className="btn btn-outline">{t("continue")}</Link>
    </div>
  );
}

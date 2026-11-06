"use client";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "./CartProvider";

export function CartLink() {
  const t = useTranslations("common");
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative grid size-11 place-items-center rounded-lg text-brown hover:bg-sand" aria-label={`${t("cart")}${ready && count ? ` (${count})` : ""}`}>
      <ShoppingCart size={22} aria-hidden />
      {ready && count > 0 && (
        <span className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-orange-dark text-[11px] font-bold text-white">{count}</span>
      )}
    </Link>
  );
}

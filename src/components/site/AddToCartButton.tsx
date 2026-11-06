"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

type Props = {
  product: { id: string; slug: string; name: string; image?: string; moq: number | null; moqUnit: "KG" | "MT" };
  className?: string;
  grade?: string;
};

export function AddToCartButton({ product, className, grade }: Props) {
  const t = useTranslations("common");
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      className={className ?? "btn btn-outline"}
      onClick={() => {
        add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          grade,
          quantity: product.moq ?? 1,
          unit: product.moq ? product.moqUnit : "MT",
        });
        setAdded(true);
      }}
    >
      {added ? <Check size={17} aria-hidden /> : <ShoppingCart size={17} aria-hidden />}
      <span aria-live="polite">{added ? t("added") : t("addToCart")}</span>
    </button>
  );
}

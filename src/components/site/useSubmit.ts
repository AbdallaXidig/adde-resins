"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

export type SubmitState = { errors: Record<string, string>; formError: string | null; pending: boolean };

/** Posts JSON to a public endpoint and turns its error codes into translated messages. */
export function useSubmit(url: string) {
  const t = useTranslations();
  const [state, setState] = useState<SubmitState>({ errors: {}, formError: null, pending: false });

  async function submit(body: unknown): Promise<{ reference: string } | null> {
    setState({ errors: {}, formError: null, pending: true });
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reference) {
        setState({ errors: {}, formError: null, pending: false });
        return { reference: data.reference };
      }
      if (res.status === 429) {
        setState({ errors: {}, formError: t("errors.rateLimited"), pending: false });
      } else if (data.problem) {
        setState({ errors: {}, formError: t(`errors.${data.problem.code}` as never, { product: data.problem.product } as never), pending: false });
      } else if (data.errors) {
        const translated: Record<string, string> = {};
        for (const [k, code] of Object.entries(data.errors as Record<string, string>)) {
          translated[k] = t(`errors.${code}` as never);
        }
        setState({ errors: translated, formError: t("forms.fixErrors"), pending: false });
      } else {
        setState({ errors: {}, formError: t("forms.serverError"), pending: false });
      }
    } catch {
      setState({ errors: {}, formError: t("forms.serverError"), pending: false });
    }
    return null;
  }
  return { ...state, submit };
}

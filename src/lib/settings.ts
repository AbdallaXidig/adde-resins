import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export type CompanySettings = {
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  hours: string;
  linkedin: string;
  facebook: string;
  youtube: string;
  showSampleBanner: boolean;
  bulkThresholdKg: number;
  /** Printed on invoices: bank details, mobile money numbers, terms. */
  paymentInstructions: string;
};

// Starting values. All are editable in Admin > Settings without a code change.
export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Adde International L.L.C.",
  email: "info@addeinternational.com",
  phone: "+252 617 794 700",
  whatsapp: "252617794700",
  location: "Puntland, Somalia",
  hours: "Saturday to Thursday, 8:00 to 17:00 (EAT)",
  linkedin: "",
  facebook: "",
  youtube: "",
  showSampleBanner: true,
  bulkThresholdKg: 1000,
  paymentInstructions: "",
};

export const getSettings = unstable_cache(
  async (): Promise<CompanySettings> => {
    const row = await prisma.setting.findUnique({ where: { key: "company" } });
    return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<CompanySettings> | null) ?? {}) };
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 },
);

export const getContentOverrides = unstable_cache(
  async (locale: string) => prisma.contentBlock.findMany({ where: { locale }, select: { key: true, value: true } }),
  ["content-overrides"],
  { tags: ["content"], revalidate: 300 },
);

export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

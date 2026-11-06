"use server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { audit, requirePermission } from "@/lib/auth";
import { DEFAULT_SETTINGS, type CompanySettings } from "@/lib/settings";
import { EDITABLE_CONTENT } from "@/lib/content-keys";
import { bool, done, fail, num, str } from "@/lib/admin-helpers";

export async function saveContent(f: FormData) {
  const user = await requirePermission("content");
  const keys = new Set(EDITABLE_CONTENT.flatMap((g) => g.keys.map((k) => k.key)));
  const locale = str(f, "locale", 2);
  if (!["en", "so", "ar"].includes(locale)) fail(f, "Unknown language.");
  for (const key of keys) {
    if (!f.has(`c_${key}`)) continue;
    const value = str(f, `c_${key}`, 8000);
    if (value) await prisma.contentBlock.upsert({ where: { key_locale: { key, locale } }, create: { key, locale, value }, update: { value } });
    else await prisma.contentBlock.deleteMany({ where: { key, locale } });
  }
  await audit(user.id, "update", "Content", locale);
  revalidateTag("content", "max");
  done(`/admin/content?locale=${locale}`, "Website content saved");
}

export async function saveSettings(f: FormData) {
  const user = await requirePermission("settings");
  const value: CompanySettings = {
    companyName: str(f, "companyName", 120) || DEFAULT_SETTINGS.companyName,
    email: str(f, "email", 200),
    phone: str(f, "phone", 40),
    whatsapp: str(f, "whatsapp", 20).replace(/\D/g, ""),
    location: str(f, "location", 160),
    hours: str(f, "hours", 200),
    linkedin: str(f, "linkedin", 300),
    facebook: str(f, "facebook", 300),
    youtube: str(f, "youtube", 300),
    showSampleBanner: bool(f, "showSampleBanner"),
    bulkThresholdKg: num(f, "bulkThresholdKg") ?? DEFAULT_SETTINGS.bulkThresholdKg,
    paymentInstructions: str(f, "paymentInstructions", 2000),
  };
  if (!/^\S+@\S+\.\S+$/.test(value.email)) fail(f, "Enter a valid email address.");
  if (value.whatsapp.length < 8) fail(f, "Enter the WhatsApp number with country code, digits only.");
  for (const url of [value.linkedin, value.facebook, value.youtube]) if (url && !/^https:\/\//.test(url)) fail(f, "Social links must start with https://");
  await prisma.setting.upsert({ where: { key: "company" }, create: { key: "company", value }, update: { value } });
  await audit(user.id, "update", "Settings");
  revalidateTag("settings", "max");
  done("/admin/settings", "Settings saved");
}

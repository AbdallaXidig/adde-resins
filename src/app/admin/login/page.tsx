import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
      <a href="/" className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-brown hover:bg-sand">
        <ArrowLeft size={16} aria-hidden className="rtl:rotate-180" />Back to website
      </a>
      <div className="card w-full p-8">
        <Logo preload className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 text-center text-2xl font-semibold">Staff sign in</h1>
        <LoginForm />
      </div>
      </div>
    </main>
  );
}

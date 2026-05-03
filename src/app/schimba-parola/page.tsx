import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/modules/auth/components/ChangePasswordForm";

export const metadata = { title: "Setează parola — Catalog Școlar" };

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const mustChange = (session as { mustChangeOnLogin?: boolean }).mustChangeOnLogin;
  if (!mustChange) {
    const roles = (session as { roles?: string[] }).roles ?? [];
    redirect(roles.includes("PARENT") ? "/panou-parinte" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Setează parola nouă</h1>
          <p className="text-muted-foreground mt-2">
            Aceasta este prima dvs. autentificare. Vă rugăm să setați o parolă personală.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

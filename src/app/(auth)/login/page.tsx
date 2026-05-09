import { LoginForm } from "@/modules/auth/components/LoginForm";
import { BookOpen } from "lucide-react";

export const metadata = {
  title: "Autentificare — Catalog Școlar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const passwordChanged = params["parola-schimbata"] === "true";

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-10">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1e3a5f] mb-4">
            <BookOpen className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] tracking-tight">
            Catalog Școlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autentificați-vă în contul dvs.
          </p>
        </div>

        {passwordChanged && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Parola a fost schimbată cu succes. Autentificați-vă cu noua parolă.
          </div>
        )}

        <LoginForm />

        <p className="text-xs text-center text-muted-foreground mt-6">
          Probleme de acces? Contactați secretariatul școlii.
        </p>
      </div>
    </div>
  );
}

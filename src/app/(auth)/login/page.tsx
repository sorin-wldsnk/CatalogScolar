import { LoginForm } from "@/modules/auth/components/LoginForm";
import { BookOpen } from "lucide-react";

export const metadata = {
  title: "Autentificare — Catalog Școlar",
};

export default function LoginPage() {
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

        <LoginForm />

        <p className="text-xs text-center text-muted-foreground mt-6">
          Probleme de acces? Contactați secretariatul școlii.
        </p>
      </div>
    </div>
  );
}

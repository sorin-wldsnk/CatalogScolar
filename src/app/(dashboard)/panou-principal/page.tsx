import { auth } from "@/auth";

export const metadata = { title: "Panou principal — Catalog Școlar" };

export default async function PanouPrincipalPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Panou principal</h1>
        <p className="text-muted-foreground mt-1">
          Bun venit, {session?.user?.name ?? "Utilizator"}!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Elevi activi", value: "—", color: "bg-blue-50 border-blue-100" },
          { label: "Absențe azi", value: "—", color: "bg-amber-50 border-amber-100" },
          { label: "Note înregistrate", value: "—", color: "bg-green-50 border-green-100" },
          { label: "Clase", value: "—", color: "bg-purple-50 border-purple-100" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${card.color}`}
          >
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

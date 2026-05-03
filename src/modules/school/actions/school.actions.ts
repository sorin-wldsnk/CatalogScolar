"use server";

import { db } from "@/db";
import { school } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { normalizeDiacritics } from "@/lib/diacritics";

const updateSchema = z.object({
  name: z.string().min(1, "Denumirea școlii este obligatorie"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email invalid").optional().or(z.literal("")).nullable(),
  cif: z.string().optional().nullable(),
});

export async function updateSchool(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await db
    .update(school)
    .set({
      name: normalizeDiacritics(parsed.data.name),
      address: parsed.data.address?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      cif: parsed.data.cif?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(school.id, schoolId));

  revalidatePath("/admin/scoala");
  return { success: true };
}

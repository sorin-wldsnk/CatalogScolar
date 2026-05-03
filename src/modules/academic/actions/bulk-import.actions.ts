"use server";

import { db } from "@/db";
import { student, enrollment, appUser, schoolMembership, userRole, role, studentGuardian } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import { normalizeDiacritics } from "@/lib/diacritics";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export type ImportRow = {
  rowIndex: number;
  nume: string;
  prenume: string;
  cnp?: string;
  dataNasterii?: string;
  clasa?: string;
  numeParinte?: string;
  prenumeParinte?: string;
  emailParinte?: string;
  telefonParinte?: string;
};

export type ImportResult = {
  success: number;
  errors: Array<{ row: number; reason: string }>;
  parentsCreated: number;
};

const rowSchema = z.object({
  rowIndex: z.number(),
  nume: z.string().min(1, "Numele este obligatoriu"),
  prenume: z.string().min(1, "Prenumele este obligatoriu"),
  cnp: z.string().optional(),
  dataNasterii: z.string().optional(),
  clasa: z.string().optional(),
  numeParinte: z.string().optional(),
  prenumeParinte: z.string().optional(),
  emailParinte: z.string().email("Email invalid").optional().or(z.literal("")).nullable(),
  telefonParinte: z.string().optional(),
});

export async function bulkImportStudents(
  rows: ImportRow[],
  academicYearId: string
): Promise<{ success: boolean; error?: string; result?: ImportResult }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Neautentificat" };

  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!(await can(roles, "student", "create" as never))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const schoolId = (session as { schoolId?: string }).schoolId;
  if (!schoolId) return { success: false, error: "Școala nu a fost găsită" };

  // Load all classes for school+year to resolve class names
  const { classGroup } = await import("@/db/schema");
  const classes = await db
    .select({ id: classGroup.id, name: classGroup.name })
    .from(classGroup)
    .where(and(eq(classGroup.schoolId, schoolId), eq(classGroup.academicYearId, academicYearId)));

  const classMap = new Map(classes.map((c) => [c.name.toUpperCase(), c.id]));

  const [parentRole] = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.code, "PARENT"))
    .limit(1);

  const result: ImportResult = { success: 0, errors: [], parentsCreated: 0 };

  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      result.errors.push({ row: row.rowIndex, reason: parsed.error.issues[0].message });
      continue;
    }

    const d = parsed.data;
    const classId = d.clasa ? classMap.get(d.clasa.toUpperCase()) ?? null : null;

    if (d.clasa && !classId) {
      result.errors.push({ row: d.rowIndex, reason: `Clasa "${d.clasa}" nu există în sistemul curent` });
      continue;
    }

    try {
      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(student)
          .values({
            schoolId,
            firstName: normalizeDiacritics(d.prenume),
            lastName: normalizeDiacritics(d.nume),
            dateOfBirth: d.dataNasterii || null,
            personalId: d.cnp?.trim() || null,
            status: "ACTIVE",
          })
          .returning();

        if (classId && academicYearId) {
          const today = new Date().toISOString().split("T")[0];
          await tx
            .insert(enrollment)
            .values({ schoolId, studentId: inserted.id, classId, academicYearId, enrolledAt: today, status: "ACTIVE" })
            .onConflictDoNothing();
        }

        const hasParent = !!(d.emailParinte && d.emailParinte.trim());
        if (hasParent) {
          const tempPassword = randomBytes(8).toString("base64url");
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          const [parentUser] = await tx
            .insert(appUser)
            .values({
              firstName: normalizeDiacritics(d.prenumeParinte?.trim() || "Tutore"),
              lastName: normalizeDiacritics(d.numeParinte?.trim() || ""),
              email: d.emailParinte!.toLowerCase().trim(),
              passwordHash,
              phone: d.telefonParinte?.trim() || null,
              mustChangeOnLogin: true,
              isActive: true,
            })
            .returning({ id: appUser.id });

          const [membership] = await tx
            .insert(schoolMembership)
            .values({ schoolId, userId: parentUser.id, isActive: true })
            .returning({ id: schoolMembership.id });

          if (parentRole) {
            await tx.insert(userRole).values({ membershipId: membership.id, roleId: parentRole.id });
          }

          await tx.insert(studentGuardian).values({
            schoolId,
            studentId: inserted.id,
            guardianUserId: parentUser.id,
            relationship: "PARENT",
            isPrimary: true,
          });

          result.parentsCreated++;
        }
      });

      result.success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        result.errors.push({ row: d.rowIndex, reason: "Email duplicat sau elev deja existent" });
      } else {
        result.errors.push({ row: d.rowIndex, reason: "Eroare la import" });
      }
    }
  }

  revalidatePath("/admin/elevi");
  return { success: true, result };
}

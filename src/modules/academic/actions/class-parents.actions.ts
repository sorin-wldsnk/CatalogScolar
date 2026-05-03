"use server";

import { db } from "@/db";
import { appUser } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { can } from "@/lib/casbin";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getClassParents } from "@/modules/academic/queries/class-parents.queries";
import { revalidatePath } from "next/cache";

async function getSessionCtx() {
  const session = await auth();
  if (!session?.user) return null;
  const schoolId = (session as { schoolId?: string }).schoolId;
  const roles = (session as { roles?: string[] }).roles ?? [];
  if (!schoolId) return null;
  return { schoolId, roles };
}

export type CredentialRow = {
  studentName: string;
  email: string;
  tempPassword: string;
};

export async function resetAndGetParentCredentials(
  classId: string,
  academicYearId: string
): Promise<{ success: boolean; error?: string; credentials?: CredentialRow[] }> {
  const ctx = await getSessionCtx();
  if (!ctx) return { success: false, error: "Neautentificat" };

  if (!(await can(ctx.roles, "class", "create"))) {
    return { success: false, error: "Nu aveți permisiunea necesară" };
  }

  const parents = await getClassParents(classId, academicYearId, ctx.schoolId);
  const pending = parents.filter((p) => p.hasAccount && p.mustChangeOnLogin && p.guardianUserId && p.email);

  if (pending.length === 0) return { success: true, credentials: [] };

  const credentials: CredentialRow[] = [];

  await Promise.all(
    pending.map(async (p) => {
      const tempPassword = randomBytes(8).toString("base64url");
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      await db
        .update(appUser)
        .set({ passwordHash, mustChangeOnLogin: true, updatedAt: new Date() })
        .where(eq(appUser.id, p.guardianUserId!));
      credentials.push({
        studentName: p.studentName,
        email: p.email!,
        tempPassword,
      });
    })
  );

  revalidatePath(`/admin/clase/${classId}`);
  return { success: true, credentials };
}

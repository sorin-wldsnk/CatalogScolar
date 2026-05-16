import { db } from "@/db";
import { schoolMembership, userRole, role } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Ensures a teacher has both TEACHER and HOMEROOM roles in their school membership.
 * Safe to call multiple times — skips roles that already exist.
 */
export async function ensureTeacherAndHomeroomRoles(teacherUserId: string, schoolId: string) {
  const [membership] = await db
    .select({ id: schoolMembership.id })
    .from(schoolMembership)
    .where(
      and(
        eq(schoolMembership.userId, teacherUserId),
        eq(schoolMembership.schoolId, schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .limit(1);

  if (!membership) return;

  const [teacherRole, homeroomRole] = await Promise.all([
    db.select({ id: role.id }).from(role).where(eq(role.code, "TEACHER")).limit(1),
    db.select({ id: role.id }).from(role).where(eq(role.code, "HOMEROOM")).limit(1),
  ]);

  if (!teacherRole[0] || !homeroomRole[0]) return;

  const targetRoleIds = [teacherRole[0].id, homeroomRole[0].id];

  const existingRoles = await db
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(
      and(
        eq(userRole.membershipId, membership.id),
        inArray(userRole.roleId, targetRoleIds)
      )
    );

  const existingRoleIds = new Set(existingRoles.map((r) => r.roleId));

  const toInsert = targetRoleIds.filter((id) => !existingRoleIds.has(id));
  if (toInsert.length > 0) {
    await db.insert(userRole).values(
      toInsert.map((roleId) => ({ membershipId: membership.id, roleId }))
    );
  }
}

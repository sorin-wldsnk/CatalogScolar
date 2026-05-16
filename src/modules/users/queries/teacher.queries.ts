import { db } from "@/db";
import { appUser, schoolMembership, userRole, role, teachingAssignment, academicYear, classGroup, subject, teacherSubject } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface TeacherRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean | null;
  mustChangeOnLogin: boolean | null;
  roles: string[];
  classCount: number;
}

export async function getTeachers(schoolId: string): Promise<TeacherRow[]> {
  const rows = await db
    .select({
      id: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      email: appUser.email,
      isActive: appUser.isActive,
      mustChangeOnLogin: appUser.mustChangeOnLogin,
      roleCode: role.code,
    })
    .from(appUser)
    .innerJoin(
      schoolMembership,
      and(
        eq(schoolMembership.userId, appUser.id),
        eq(schoolMembership.schoolId, schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .innerJoin(userRole, eq(userRole.membershipId, schoolMembership.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(
      and(
        eq(appUser.isActive, true),
        inArray(role.code, ["TEACHER", "HOMEROOM"])
      )
    )
    .orderBy(appUser.lastName, appUser.firstName);

  const map = new Map<string, TeacherRow>();
  for (const r of rows) {
    const existing = map.get(r.id);
    if (existing) {
      if (!existing.roles.includes(r.roleCode)) existing.roles.push(r.roleCode);
    } else {
      map.set(r.id, {
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        isActive: r.isActive,
        mustChangeOnLogin: r.mustChangeOnLogin,
        roles: [r.roleCode],
        classCount: 0,
      });
    }
  }

  if (map.size > 0) {
    const counts = await db
      .select({
        teacherUserId: teachingAssignment.teacherUserId,
        cnt: sql<number>`COUNT(DISTINCT ${teachingAssignment.classId})`,
      })
      .from(teachingAssignment)
      .where(eq(teachingAssignment.schoolId, schoolId))
      .groupBy(teachingAssignment.teacherUserId);

    for (const c of counts) {
      const t = map.get(c.teacherUserId);
      if (t) t.classCount = Number(c.cnt);
    }
  }

  return Array.from(map.values());
}

export async function getTeacherById(id: string, schoolId: string): Promise<TeacherRow | null> {
  const rows = await db
    .select({
      id: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
      email: appUser.email,
      isActive: appUser.isActive,
      mustChangeOnLogin: appUser.mustChangeOnLogin,
      roleCode: role.code,
    })
    .from(appUser)
    .innerJoin(
      schoolMembership,
      and(
        eq(schoolMembership.userId, appUser.id),
        eq(schoolMembership.schoolId, schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .innerJoin(userRole, eq(userRole.membershipId, schoolMembership.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(
      and(
        eq(appUser.id, id),
        inArray(role.code, ["TEACHER", "HOMEROOM"])
      )
    );

  if (rows.length === 0) return null;

  const rolesList: string[] = [];
  for (const r of rows) {
    if (!rolesList.includes(r.roleCode)) rolesList.push(r.roleCode);
  }
  const first = rows[0];
  return {
    id: first.id,
    firstName: first.firstName,
    lastName: first.lastName,
    email: first.email,
    isActive: first.isActive,
    mustChangeOnLogin: first.mustChangeOnLogin,
    roles: rolesList,
    classCount: 0,
  };
}

export async function getHomeroomTeachers(schoolId: string) {
  const rows = await db
    .select({
      id: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
    })
    .from(appUser)
    .innerJoin(
      schoolMembership,
      and(
        eq(schoolMembership.userId, appUser.id),
        eq(schoolMembership.schoolId, schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .innerJoin(userRole, eq(userRole.membershipId, schoolMembership.id))
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(
      and(
        eq(appUser.isActive, true),
        eq(role.code, "HOMEROOM")
      )
    )
    .orderBy(appUser.lastName, appUser.firstName);

  // Deduplicate (teacher may have multiple roles)
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export async function getTeacherSubjects(teacherUserId: string, schoolId: string) {
  return db
    .select({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      gradeLevels: subject.gradeLevels,
    })
    .from(teacherSubject)
    .innerJoin(subject, eq(teacherSubject.subjectId, subject.id))
    .where(
      and(
        eq(teacherSubject.teacherUserId, teacherUserId),
        eq(teacherSubject.schoolId, schoolId)
      )
    )
    .orderBy(subject.name);
}

export async function getTeachersForSubject(subjectId: string, schoolId: string) {
  return db
    .select({
      id: appUser.id,
      firstName: appUser.firstName,
      lastName: appUser.lastName,
    })
    .from(teacherSubject)
    .innerJoin(appUser, eq(teacherSubject.teacherUserId, appUser.id))
    .innerJoin(
      schoolMembership,
      and(
        eq(schoolMembership.userId, appUser.id),
        eq(schoolMembership.schoolId, schoolId),
        eq(schoolMembership.isActive, true)
      )
    )
    .where(
      and(
        eq(teacherSubject.subjectId, subjectId),
        eq(teacherSubject.schoolId, schoolId),
        eq(appUser.isActive, true)
      )
    )
    .orderBy(appUser.lastName, appUser.firstName);
}

export async function getTeacherAssignments(teacherId: string, schoolId: string) {
  return db
    .select({
      id: teachingAssignment.id,
      academicYearId: teachingAssignment.academicYearId,
      academicYearName: academicYear.name,
      classId: teachingAssignment.classId,
      className: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      subjectId: teachingAssignment.subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
    })
    .from(teachingAssignment)
    .innerJoin(academicYear, eq(teachingAssignment.academicYearId, academicYear.id))
    .innerJoin(classGroup, eq(teachingAssignment.classId, classGroup.id))
    .innerJoin(subject, eq(teachingAssignment.subjectId, subject.id))
    .where(
      and(
        eq(teachingAssignment.teacherUserId, teacherId),
        eq(teachingAssignment.schoolId, schoolId)
      )
    )
    .orderBy(academicYear.name, classGroup.gradeLevel, classGroup.name, subject.name);
}

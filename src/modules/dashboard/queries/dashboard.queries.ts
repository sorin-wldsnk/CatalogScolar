import { db } from "@/db";
import {
  enrollment,
  appUser,
  schoolMembership,
  userRole,
  role,
  classGroup,
  absence,
  teachingAssignment,
} from "@/db/schema";
import { eq, and, inArray, sql, count } from "drizzle-orm";

export async function getAdminDashboardStats(schoolId: string, academicYearId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [activeStudentsRow] = await db
    .select({ cnt: count() })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.schoolId, schoolId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.status, "ACTIVE")
      )
    );

  const teacherRows = await db
    .selectDistinct({ userId: appUser.id })
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
    );

  const [classesRow] = await db
    .select({ cnt: count() })
    .from(classGroup)
    .where(
      and(
        eq(classGroup.schoolId, schoolId),
        eq(classGroup.academicYearId, academicYearId)
      )
    );

  const [absentsTodayRow] = await db
    .select({ cnt: count() })
    .from(absence)
    .where(
      and(
        eq(absence.schoolId, schoolId),
        eq(absence.status, "UNEXCUSED"),
        eq(absence.absentDate, today)
      )
    );

  return {
    activeStudents: Number(activeStudentsRow?.cnt ?? 0),
    totalTeachers: teacherRows.length,
    activeClasses: Number(classesRow?.cnt ?? 0),
    unexcusedAbsencesToday: Number(absentsTodayRow?.cnt ?? 0),
  };
}

export async function getTeacherDashboardStats(
  teacherUserId: string,
  schoolId: string,
  academicYearId: string
) {
  const classRows = await db
    .selectDistinct({ classId: teachingAssignment.classId })
    .from(teachingAssignment)
    .where(
      and(
        eq(teachingAssignment.teacherUserId, teacherUserId),
        eq(teachingAssignment.schoolId, schoolId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    );

  const classCount = classRows.length;

  if (classCount === 0) {
    return { classCount: 0, studentCount: 0 };
  }

  const classIds = classRows.map((r) => r.classId);

  const [studentsRow] = await db
    .select({ cnt: count() })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.schoolId, schoolId),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.status, "ACTIVE"),
        inArray(enrollment.classId, classIds)
      )
    );

  return {
    classCount,
    studentCount: Number(studentsRow?.cnt ?? 0),
  };
}

export async function getHomeroomDashboardStats(
  teacherUserId: string,
  schoolId: string,
  academicYearId: string
) {
  const today = new Date().toISOString().split("T")[0];

  const [classRow] = await db
    .select({ id: classGroup.id, name: classGroup.name })
    .from(classGroup)
    .where(
      and(
        eq(classGroup.homeroomTeacherId, teacherUserId),
        eq(classGroup.schoolId, schoolId),
        eq(classGroup.academicYearId, academicYearId)
      )
    )
    .limit(1);

  if (!classRow) {
    return { homeroomClass: null, studentCount: 0, unexcusedToday: 0, pendingExcuses: 0 };
  }

  const [studentsRow] = await db
    .select({ cnt: count() })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.classId, classRow.id),
        eq(enrollment.academicYearId, academicYearId),
        eq(enrollment.status, "ACTIVE")
      )
    );

  const [unexcusedRow] = await db
    .select({ cnt: count() })
    .from(absence)
    .innerJoin(enrollment, eq(absence.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.classId, classRow.id),
        eq(absence.status, "UNEXCUSED"),
        eq(absence.absentDate, today)
      )
    );

  const [pendingRow] = await db
    .select({ cnt: count() })
    .from(absence)
    .innerJoin(enrollment, eq(absence.enrollmentId, enrollment.id))
    .where(
      and(
        eq(enrollment.classId, classRow.id),
        eq(absence.academicYearId, academicYearId),
        eq(absence.status, "PENDING_EXCUSE")
      )
    );

  return {
    homeroomClass: classRow,
    studentCount: Number(studentsRow?.cnt ?? 0),
    unexcusedToday: Number(unexcusedRow?.cnt ?? 0),
    pendingExcuses: Number(pendingRow?.cnt ?? 0),
  };
}

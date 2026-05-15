import { db } from "@/db";
import { classGroup, appUser, enrollment, teachingAssignment } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getClasses(schoolId: string, academicYearId: string) {
  return db
    .select({
      id: classGroup.id,
      name: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      academicYearId: classGroup.academicYearId,
      homeroomTeacherId: classGroup.homeroomTeacherId,
      homeroomTeacherName: sql<string | null>`
        concat(${appUser.firstName}, ' ', ${appUser.lastName})
      `.as("homeroom_teacher_name"),
      studentCount: sql<number>`
        (select count(*) from enrollment e
         where e.class_id = ${classGroup.id}
           and e.academic_year_id = ${academicYearId}
           and e.status = 'ACTIVE')
      `.as("student_count"),
    })
    .from(classGroup)
    .leftJoin(appUser, eq(classGroup.homeroomTeacherId, appUser.id))
    .where(
      and(
        eq(classGroup.schoolId, schoolId),
        eq(classGroup.academicYearId, academicYearId)
      )
    )
    .orderBy(classGroup.gradeLevel, classGroup.name);
}

export async function getClassById(id: string, schoolId: string) {
  const [row] = await db
    .select({
      id: classGroup.id,
      schoolId: classGroup.schoolId,
      academicYearId: classGroup.academicYearId,
      name: classGroup.name,
      gradeLevel: classGroup.gradeLevel,
      homeroomTeacherId: classGroup.homeroomTeacherId,
      homeroomTeacherFirstName: appUser.firstName,
      homeroomTeacherLastName: appUser.lastName,
    })
    .from(classGroup)
    .leftJoin(appUser, eq(classGroup.homeroomTeacherId, appUser.id))
    .where(and(eq(classGroup.id, id), eq(classGroup.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function getClassesForTeacher(teacherUserId: string, academicYearId: string) {
  return db
    .selectDistinct({ class: classGroup })
    .from(teachingAssignment)
    .innerJoin(classGroup, eq(teachingAssignment.classId, classGroup.id))
    .where(
      and(
        eq(teachingAssignment.teacherUserId, teacherUserId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .orderBy(classGroup.gradeLevel, classGroup.name);
}

import { db } from "@/db";
import { subject, teachingAssignment, classGroup, appUser } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getSubjects(schoolId: string) {
  return db
    .select()
    .from(subject)
    .where(eq(subject.schoolId, schoolId))
    .orderBy(subject.name);
}

export async function getSubjectsForClass(classId: string, academicYearId: string, schoolId: string) {
  return db
    .select({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      gradeLevels: subject.gradeLevels,
      isItinerant: subject.isItinerant,
      assignmentId: teachingAssignment.id,
      teacherUserId: teachingAssignment.teacherUserId,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
    })
    .from(subject)
    .innerJoin(classGroup, eq(classGroup.id, classId))
    .leftJoin(
      teachingAssignment,
      and(
        eq(teachingAssignment.subjectId, subject.id),
        eq(teachingAssignment.classId, classId),
        eq(teachingAssignment.academicYearId, academicYearId)
      )
    )
    .leftJoin(appUser, eq(appUser.id, teachingAssignment.teacherUserId))
    .where(
      and(
        eq(subject.schoolId, schoolId),
        sql`${classGroup.gradeLevel} = ANY(${subject.gradeLevels})`
      )
    )
    .orderBy(subject.name);
}

export async function getSubjectsForTeacherForm(schoolId: string) {
  return db
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.schoolId, schoolId),
        sql`(
          ${subject.gradeLevels} && ARRAY[5,6,7,8]::integer[]
          OR (${subject.gradeLevels} && ARRAY[0,1,2,3,4]::integer[] AND ${subject.isItinerant} = true)
        )`
      )
    )
    .orderBy(subject.name);
}

export async function getSubjectById(id: string, schoolId: string) {
  const [s] = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
    .limit(1);
  return s ?? null;
}

import { db } from "@/db";
import { observation, appUser, enrollment, classGroup } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getObservationsForEnrollment(
  enrollmentId: string,
  semester?: number
) {
  const conditions = [eq(observation.enrollmentId, enrollmentId)];
  if (semester) conditions.push(eq(observation.semester, semester));

  return db
    .select({
      id: observation.id,
      teacherFirstName: appUser.firstName,
      teacherLastName: appUser.lastName,
      semester: observation.semester,
      body: observation.body,
      isVisibleToParent: observation.isVisibleToParent,
      createdAt: observation.createdAt,
    })
    .from(observation)
    .innerJoin(appUser, eq(observation.teacherUserId, appUser.id))
    .where(and(...conditions))
    .orderBy(observation.createdAt);
}

export async function getObservationsForClass(
  classId: string,
  academicYearId: string
) {
  return db
    .select({
      id: observation.id,
      enrollmentId: observation.enrollmentId,
      studentFirstName: appUser.firstName,
      studentLastName: appUser.lastName,
      className: classGroup.name,
      semester: observation.semester,
      body: observation.body,
      isVisibleToParent: observation.isVisibleToParent,
      createdAt: observation.createdAt,
    })
    .from(observation)
    .innerJoin(enrollment, eq(observation.enrollmentId, enrollment.id))
    .innerJoin(appUser, eq(enrollment.studentId, appUser.id))
    .innerJoin(classGroup, eq(enrollment.classId, classGroup.id))
    .where(
      and(
        eq(enrollment.classId, classId),
        eq(observation.academicYearId, academicYearId)
      )
    )
    .orderBy(appUser.lastName, observation.createdAt);
}

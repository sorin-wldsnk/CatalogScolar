import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hash } from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { normalizeDiacritics } from "../lib/diacritics";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const ROLES = [
  { code: "ADMIN", displayName: "Administrator" },
  { code: "TEACHER", displayName: "Profesor" },
  { code: "HOMEROOM", displayName: "Diriginte" },
  { code: "PARENT", displayName: "Părinte" },
  { code: "SECRETARY", displayName: "Secretar" },
];

async function seed() {
  console.log("Seeding database...");

  // ── Roles ──────────────────────────────────────────────────────────────────
  const insertedRoles = await db
    .insert(schema.role)
    .values(ROLES)
    .onConflictDoNothing()
    .returning();
  console.log(`Roles: ${insertedRoles.length} inserted`);

  // ── School ─────────────────────────────────────────────────────────────────
  const [insertedSchool] = await db
    .insert(schema.school)
    .values({
      name: "Școala Generală Nr. 1",
      slug: "scoala-generala-nr-1",
      address: "Strada Principală nr. 1",
      email: "contact@scoala1.ro",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!insertedSchool) {
    console.log("School already exists — skipping base seed");
    await seedAcademic();
    await client.end();
    return;
  }
  console.log(`School: ${insertedSchool.name}`);

  // ── Admin user ─────────────────────────────────────────────────────────────
  const passwordHash = await hash("Admin@1234!", 12);
  const [adminUser] = await db
    .insert(schema.appUser)
    .values({
      email: "admin@catalogscolar.ro",
      passwordHash,
      firstName: normalizeDiacritics("Administrator"),
      lastName: normalizeDiacritics("Sistem"),
      isActive: true,
      mustChangeOnLogin: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!adminUser) {
    console.log("Admin user already exists");
    await seedAcademic();
    await client.end();
    return;
  }
  console.log(`Admin: ${adminUser.email}`);

  const [membership] = await db
    .insert(schema.schoolMembership)
    .values({ schoolId: insertedSchool.id, userId: adminUser.id, isActive: true })
    .returning();

  const allRoles = await db.select().from(schema.role);
  const adminRole = allRoles.find((r) => r.code === "ADMIN");
  if (adminRole) {
    await db
      .insert(schema.userRole)
      .values({ membershipId: membership.id, roleId: adminRole.id })
      .onConflictDoNothing();
    console.log("ADMIN role assigned");
  }

  await seedAcademic();
  console.log("Seeding complete.");
  await client.end();
}

async function seedAcademic() {
  // ── Resolve school ─────────────────────────────────────────────────────────
  const [school] = await db
    .select()
    .from(schema.school)
    .where(
      (await import("drizzle-orm")).eq(schema.school.slug, "scoala-generala-nr-1")
    )
    .limit(1);

  if (!school) {
    console.log("School not found — skipping academic seed");
    return;
  }

  // ── Academic year ──────────────────────────────────────────────────────────
  const [year] = await db
    .insert(schema.academicYear)
    .values({
      schoolId: school.id,
      name: "2024-2025",
      startDate: "2024-09-09",
      endDate: "2025-06-13",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  const activeYear = year ?? (
    await db
      .select()
      .from(schema.academicYear)
      .where(
        (await import("drizzle-orm")).and(
          (await import("drizzle-orm")).eq(schema.academicYear.schoolId, school.id),
          (await import("drizzle-orm")).eq(schema.academicYear.name, "2024-2025")
        )
      )
      .limit(1)
  )[0];

  if (!activeYear) {
    console.log("Could not resolve academic year");
    return;
  }
  console.log(`Academic year: ${activeYear.name}`);

  // ── Classes ────────────────────────────────────────────────────────────────
  const classesData = [
    { name: "7A", gradeLevel: 7 },
    { name: "7B", gradeLevel: 7 },
    { name: "8A", gradeLevel: 8 },
    { name: "8B", gradeLevel: 8 },
  ];

  const insertedClasses: (typeof schema.classGroup.$inferSelect)[] = [];
  for (const cls of classesData) {
    const [inserted] = await db
      .insert(schema.classGroup)
      .values({
        schoolId: school.id,
        academicYearId: activeYear.id,
        name: cls.name,
        gradeLevel: cls.gradeLevel,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) insertedClasses.push(inserted);
  }

  // fetch all if some already existed
  const { eq, and } = await import("drizzle-orm");
  const allClasses = await db
    .select()
    .from(schema.classGroup)
    .where(
      and(
        eq(schema.classGroup.schoolId, school.id),
        eq(schema.classGroup.academicYearId, activeYear.id)
      )
    );
  console.log(`Classes: ${allClasses.length} total`);

  // ── Subjects ───────────────────────────────────────────────────────────────
  const subjectsData = [
    { name: "Comunicare in limba romana", code: "CLR", gradeLevels: [0,1,2], isItinerant: false },
    { name: "Limba si literatura romana", code: "LLR", gradeLevels: [3,4,5,6,7,8], isItinerant: false },
    { name: "Limba moderna / Limba moderna 1", code: "LM1", gradeLevels: [0,1,2,3,4,5,6,7,8], isItinerant: true },
    { name: "Limba moderna 2", code: "LM2", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Elemente de limba latina si cultura romanica", code: "LAT", gradeLevels: [7], isItinerant: false },
    { name: "Matematica si explorarea mediului", code: "MEM", gradeLevels: [0,1,2], isItinerant: false },
    { name: "Matematica", code: "MAT", gradeLevels: [3,4,5,6,7,8], isItinerant: false },
    { name: "Stiinte ale naturii", code: "SAN", gradeLevels: [3,4], isItinerant: false },
    { name: "Biologie", code: "BIO", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Fizica", code: "FIZ", gradeLevels: [6,7,8], isItinerant: false },
    { name: "Chimie", code: "CHI", gradeLevels: [7,8], isItinerant: false },
    { name: "Religie", code: "REL", gradeLevels: [0,1,2,3,4,5,6,7,8], isItinerant: true },
    { name: "Dezvoltare personala", code: "DEP", gradeLevels: [0,1,2], isItinerant: false },
    { name: "Consiliere si dezvoltare personala", code: "CDP", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Educatie civica", code: "EDC", gradeLevels: [3,4], isItinerant: false },
    { name: "Educatie sociala", code: "EDS", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Istorie", code: "IST", gradeLevels: [4,5,6,7,8], isItinerant: false },
    { name: "Geografie", code: "GEO", gradeLevels: [4,5,6,7,8], isItinerant: false },
    { name: "Educatie fizica", code: "EDF", gradeLevels: [0,1,2,3,4], isItinerant: true },
    { name: "Educatie fizica si sport", code: "EFS", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Joc si miscare", code: "JOC", gradeLevels: [3,4], isItinerant: false },
    { name: "Muzica si miscare", code: "MUZ", gradeLevels: [0,1,2,3,4], isItinerant: false },
    { name: "Educatie muzicala", code: "EDM", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Arte vizuale si abilitati practice", code: "AVA", gradeLevels: [0,1,2,3,4], isItinerant: false },
    { name: "Educatie plastica", code: "EDP", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Educatie tehnologica si aplicatii practice", code: "ETP", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Informatica si TIC", code: "TIC", gradeLevels: [5,6,7,8], isItinerant: false },
    { name: "Optional / CDS", code: "OPT", gradeLevels: [0,1,2,3,4,5,6,7,8], isItinerant: true },
  ];

  for (const sub of subjectsData) {
    await db
      .insert(schema.subject)
      .values({ schoolId: school.id, ...sub })
      .onConflictDoUpdate({
        target: [schema.subject.schoolId, schema.subject.code],
        set: { name: sub.name, gradeLevels: sub.gradeLevels, isItinerant: sub.isItinerant },
      });
  }
  console.log(`Subjects: ${subjectsData.length} upserted`);

  // ── Demo students in 7A ────────────────────────────────────────────────────
  const class7A = allClasses.find((c) => c.name === "7A");
  if (!class7A) return;

  const studentsData = [
    { firstName: normalizeDiacritics("Andrei"), lastName: normalizeDiacritics("Popescu") },
    { firstName: normalizeDiacritics("Maria"), lastName: normalizeDiacritics("Ionescu") },
    { firstName: normalizeDiacritics("Ștefan"), lastName: normalizeDiacritics("Gheorghe") },
  ];

  for (const s of studentsData) {
    const [st] = await db
      .insert(schema.student)
      .values({ schoolId: school.id, ...s, status: "ACTIVE" })
      .onConflictDoNothing()
      .returning();

    if (st) {
      await db
        .insert(schema.enrollment)
        .values({
          schoolId: school.id,
          studentId: st.id,
          classId: class7A.id,
          academicYearId: activeYear.id,
          enrolledAt: "2024-09-09",
          status: "ACTIVE",
        })
        .onConflictDoNothing();
    }
  }
  console.log("Demo students: 3 inserted in 7A");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

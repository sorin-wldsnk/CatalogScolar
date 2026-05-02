import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hash } from "bcryptjs";
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

  const insertedRoles = await db
    .insert(schema.role)
    .values(ROLES)
    .onConflictDoNothing()
    .returning();
  console.log(`Inserted ${insertedRoles.length} roles`);

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
    console.log("School already exists, skipping admin user creation");
    await client.end();
    return;
  }
  console.log(`Inserted school: ${insertedSchool.name}`);

  const passwordHash = await hash("Admin@1234!", 12);
  const [adminUser] = await db
    .insert(schema.appUser)
    .values({
      email: "admin@catalogscolar.ro",
      passwordHash,
      firstName: "Administrator",
      lastName: "Sistem",
      isActive: true,
      mustChangeOnLogin: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!adminUser) {
    console.log("Admin user already exists");
    await client.end();
    return;
  }
  console.log(`Inserted admin user: ${adminUser.email}`);

  const [membership] = await db
    .insert(schema.schoolMembership)
    .values({
      schoolId: insertedSchool.id,
      userId: adminUser.id,
      isActive: true,
    })
    .returning();

  const allRoles = await db.select().from(schema.role);
  const adminRole = allRoles.find((r) => r.code === "ADMIN");
  if (adminRole) {
    await db
      .insert(schema.userRole)
      .values({ membershipId: membership.id, roleId: adminRole.id })
      .onConflictDoNothing();
    console.log("Assigned ADMIN role to admin user");
  }

  console.log("Seeding complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

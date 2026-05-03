"use server";

import { db } from "@/db";
import { appUser } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  newPassword: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Parolele nu coincid",
  path: ["confirmPassword"],
});

export async function changePassword(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Neautentificat" };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await db
    .update(appUser)
    .set({ passwordHash, mustChangeOnLogin: false, updatedAt: new Date() })
    .where(eq(appUser.id, session.user.id));

  return { success: true };
}

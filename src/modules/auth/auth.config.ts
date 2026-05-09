import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { appUser, schoolMembership, userRole, role } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(appUser)
          .where(eq(appUser.email, email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const passwordMatch = await compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        const memberships = await db
          .select({ schoolId: schoolMembership.schoolId })
          .from(schoolMembership)
          .where(eq(schoolMembership.userId, user.id))
          .limit(1);

        const schoolId = memberships[0]?.schoolId ?? null;

        const roles = schoolId
          ? await db
              .select({ code: role.code })
              .from(userRole)
              .innerJoin(
                schoolMembership,
                eq(userRole.membershipId, schoolMembership.id)
              )
              .innerJoin(role, eq(userRole.roleId, role.id))
              .where(eq(schoolMembership.userId, user.id))
          : [];

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          schoolId,
          roles: roles.map((r) => r.code),
          mustChangeOnLogin: user.mustChangeOnLogin ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
        token.roles = (user as { roles?: string[] }).roles ?? [];
        token.mustChangeOnLogin =
          (user as { mustChangeOnLogin?: boolean }).mustChangeOnLogin ?? false;
      } else if (token.mustChangeOnLogin) {
        // Re-read from DB only when token claims mustChange is still true.
        // This catches the case where the user changed their password but the
        // JWT cookie wasn't invalidated (e.g. unstable_update failed or was skipped).
        const [fresh] = await db
          .select({ mustChangeOnLogin: appUser.mustChangeOnLogin })
          .from(appUser)
          .where(eq(appUser.id, token.sub as string))
          .limit(1);
        token.mustChangeOnLogin = fresh?.mustChangeOnLogin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      (session as { schoolId?: string | null }).schoolId =
        token.schoolId as string | null;
      (session as { roles?: string[] }).roles = token.roles as string[];
      (session as { mustChangeOnLogin?: boolean }).mustChangeOnLogin =
        token.mustChangeOnLogin as boolean;
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
};

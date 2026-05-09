import NextAuth from "next-auth";
import { authConfig } from "./modules/auth/auth.config";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(authConfig);

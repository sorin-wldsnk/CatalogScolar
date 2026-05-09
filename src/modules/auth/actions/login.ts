"use server";

import { signIn } from "@/auth";
import { auth } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    // Read the freshly created session to get roles and mustChangeOnLogin
    const session = await auth();
    const roles = (session as { roles?: string[] })?.roles ?? [];
    const mustChangeOnLogin =
      (session as { mustChangeOnLogin?: boolean })?.mustChangeOnLogin ?? false;

    return { success: true, roles, mustChangeOnLogin };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email sau parolă incorecte." };
        default:
          return { success: false, error: "A apărut o eroare. Încercați din nou." };
      }
    }
    throw error;
  }
}

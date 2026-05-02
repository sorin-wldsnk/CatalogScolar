"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
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

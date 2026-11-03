"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  let result: string;

  try {
    // redirect: false so we can inspect the outcome ourselves — Auth.js's
    // Credentials provider signals invalid credentials via a returned URL
    // containing "?error=...", not by throwing, so a bare try/catch here
    // (as commonly shown in docs) silently treats wrong credentials as
    // success. redirectTo is explicit so a successful login lands on "/"
    // directly instead of back on "/login" (which relied on middleware to
    // bounce it forward, an extra hop that occasionally raced the cookie
    // write and looked like login "did nothing").
    result = await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirect: false,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email ou mot de passe invalide.";
    }
    throw error;
  }

  if (result.includes("error=")) {
    return "Email ou mot de passe invalide.";
  }

  redirect(result);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

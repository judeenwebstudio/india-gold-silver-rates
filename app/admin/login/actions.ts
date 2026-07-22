"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { adminCredentialsSchema } from "@/lib/auth-validation";

export type LoginActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

function readValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function getSafeRedirect(value: string) {
  if (value.startsWith("/admin/") && !value.startsWith("//")) {
    return value;
  }

  return "/admin/dashboard";
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const validation = adminCredentialsSchema.safeParse({
    email: readValue(formData, "email"),
    password: readValue(formData, "password"),
  });

  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;

    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        email: errors.email?.[0],
        password: errors.password?.[0],
      },
    };
  }

  try {
    await signIn("credentials", {
      email: validation.data.email,
      password: validation.data.password,
      redirectTo: getSafeRedirect(readValue(formData, "callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message:
          error.type === "CredentialsSignin"
            ? "The email or password is incorrect."
            : "Sign-in is temporarily unavailable. Please try again.",
      };
    }

    throw error;
  }

  return {
    status: "idle",
    message: "",
  };
}

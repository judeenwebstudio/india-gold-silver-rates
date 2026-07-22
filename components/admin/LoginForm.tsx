"use client";

import { useActionState } from "react";

import {
  loginAction,
  type LoginActionState,
} from "@/app/admin/login/actions";

type LoginFormProps = {
  callbackUrl: string;
};

const initialLoginState: LoginActionState = {
  status: "idle",
  message: "",
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginState,
  );

  return (
    <form action={formAction} className="mt-7 space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.status === "error" && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="admin-email" className="mb-2 block text-sm font-bold text-stone-800">
          Email address
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "admin-email-error" : undefined}
          placeholder="admin@example.com"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
        />
        {state.fieldErrors?.email && (
          <p id="admin-email-error" className="mt-2 text-sm font-semibold text-red-700">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm font-bold text-stone-800">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "admin-password-error" : undefined}
          placeholder="Enter your password"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
        />
        {state.fieldErrors?.password && (
          <p id="admin-password-error" className="mt-2 text-sm font-semibold text-red-700">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-stone-950 text-sm font-black text-white shadow-lg shadow-stone-900/15 transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:bg-stone-400"
      >
        {isPending ? "Signing in..." : "Sign in securely"}
      </button>
    </form>
  );
}

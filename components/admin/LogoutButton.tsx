import { logoutAction } from "@/app/admin/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-black text-stone-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800"
      >
        Log out
      </button>
    </form>
  );
}

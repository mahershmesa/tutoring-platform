import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/lib/auth/actions";
import { isAdmin } from "@/lib/admin/guard";

export default async function AuthNav() {
  const supabase = createClient();
  let user = null;
  let admin = false;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (user) admin = await isAdmin(supabase, user.id);
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/login"
          className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal"
        >
          دخول
        </Link>
        <Link
          href="/register"
          className="rounded-xl bg-teal px-3 py-1.5 font-medium text-white hover:bg-teal-dark"
        >
          تسجيل
        </Link>
      </div>
    );
  }

  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <div className="flex items-center gap-3 text-sm">
      {admin && (
        <Link
          href="/admin"
          className="rounded-xl bg-amber-light px-3 py-1.5 font-medium text-amber hover:bg-amber hover:text-white"
        >
          الإدارة
        </Link>
      )}
      <Link
        href="/profile"
        className="font-medium text-teal-dark hover:underline"
      >
        {name}
      </Link>
      <form action={signout}>
        <button className="rounded-xl border border-border px-3 py-1.5 text-ink-soft hover:border-teal">
          خروج
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/lib/auth/actions";

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const primaryPill =
  "relative flex items-center gap-1.5 rounded-full bg-teal px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:bg-teal-dark";

export default async function AuthNav() {
  const supabase = createClient();
  let user = null;
  const roles = new Set<string>();
  let unread = 0;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (user) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      (roleRows ?? []).forEach((r) => roles.add(r.role as string));

      if (roles.has("teacher")) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
          .eq("status", "sent");
        unread = count ?? 0;
      }
    }
  }

  const admin = roles.has("admin");
  const teacher = roles.has("teacher");
  const student = roles.has("student");

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
    <div className="flex items-center gap-2 text-sm">
      {teacher && (
        <Link href="/inbox" className={primaryPill}>
          <InboxIcon />
          الوارد
          {unread > 0 && (
            <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-surface">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      )}
      {student && (
        <Link href="/ask" className={primaryPill}>
          <AskIcon />
          اسأل
        </Link>
      )}
      {admin && (
        <Link
          href="/admin"
          className="rounded-xl bg-amber-light px-3 py-1.5 font-medium text-amber hover:bg-amber hover:text-white"
        >
          الإدارة
        </Link>
      )}
      <Link href="/profile" className="text-teal-dark hover:underline">
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

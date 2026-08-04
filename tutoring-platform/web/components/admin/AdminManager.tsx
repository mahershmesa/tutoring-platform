"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { findUserByPhone, grantAdmin, revokeAdmin } from "@/lib/admin/actions";

export type AdminRow = {
  userId: string;
  name: string;
  phone: string | null;
  isSelf: boolean;
};

const CONFIRM_WORD = "ترقية";

export default function AdminManager({ admins }: { admins: AdminRow[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // حالة نافذة التأكيد القوي
  const [target, setTarget] = useState<{ userId: string; name: string } | null>(
    null,
  );
  const [confirmText, setConfirmText] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await findUserByPhone(phone);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    if (res.already) {
      setErr("هذا المستخدم أدمن مسبقاً.");
      return;
    }
    setConfirmText("");
    setTarget({ userId: res.userId!, name: res.name ?? "مستخدم" });
  }

  async function confirmGrant() {
    if (!target || confirmText.trim() !== CONFIRM_WORD) return;
    setBusy(true);
    const res = await grantAdmin(target.userId);
    setBusy(false);
    if (res.error) setErr(res.error);
    else {
      setTarget(null);
      setPhone("");
      router.refresh();
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    const res = await revokeAdmin(userId);
    setBusy(false);
    if (res.error) setErr(res.error);
    else router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        ⚠️ صلاحية الأدمن هي <strong>أخطر صلاحية</strong> في الموقع: قبول
        المدرّسين، إدارة كل المحتوى، وترقية/سحب مدراء آخرين. لا تمنحها إلا لشخص
        تثق به تماماً.
      </div>

      <form onSubmit={lookup} className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          inputMode="tel"
          placeholder="رقم هاتف المستخدم المراد ترقيته"
          className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-right text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy}
          className="whitespace-nowrap rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          بحث
        </button>
      </form>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {admins.map((a) => (
          <li key={a.userId} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium text-ink">{a.name}</span>
              {a.isSelf && (
                <span className="mr-2 rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal-dark">
                  أنت
                </span>
              )}
              {a.phone && (
                <span className="mr-2 text-xs text-ink-soft" dir="ltr">
                  {a.phone}
                </span>
              )}
            </div>
            {!a.isSelf && (
              <button
                onClick={() => remove(a.userId)}
                disabled={busy}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                سحب الصلاحية
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* نافذة التأكيد القوي */}
      {target && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-red-700">
              تأكيد ترقية إلى أدمن
            </h3>
            <p className="mt-2 text-sm text-ink">
              أنت على وشك منح صلاحية <strong>الأدمن الكاملة</strong> لـ{" "}
              <strong>{target.name}</strong>. هذا الشخص سيتمكّن من إدارة كل شيء،
              بما فيه ترقية/سحب مدراء آخرين. <strong>لا يمكن التراجع تلقائياً.</strong>
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              للتأكيد، اكتب كلمة <strong className="text-ink">«{CONFIRM_WORD}»</strong>{" "}
              في الحقل:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTarget(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2 text-sm text-ink-soft hover:border-teal"
              >
                إلغاء
              </button>
              <button
                onClick={confirmGrant}
                disabled={busy || confirmText.trim() !== CONFIRM_WORD}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "…جارٍ" : "تأكيد الترقية"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

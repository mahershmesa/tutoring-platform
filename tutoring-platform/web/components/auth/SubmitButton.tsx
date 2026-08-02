"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-teal px-4 py-2.5 font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
    >
      {pending ? "…جارٍ" : children}
    </button>
  );
}

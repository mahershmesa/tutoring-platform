import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 text-center text-2xl font-bold text-teal-dark"
      >
        دليلي
      </Link>
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

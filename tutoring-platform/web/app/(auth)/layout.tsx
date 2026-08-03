import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Logo size="lg" />
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

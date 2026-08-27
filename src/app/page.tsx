import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Campero ERP</h1>
      <p className="max-w-md text-sm text-neutral-500">
        Contabilidad y tributación de dos entidades (Campero Ltda y René Aravena Riffo).
      </p>
      <Link
        href="/entidades"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Ver entidades
      </Link>
    </main>
  );
}

import Link from "next/link";

export default function NewMovementStubPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col gap-4 p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/inventory/movements"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          ← Kembali ke daftar
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Buat movement</h1>
      <p className="text-default-600">
        Form pembuatan movement (inbound / outbound / transfer / adjustment) akan diisi pada{" "}
        <strong>F6.2</strong> — termasuk header <code>Idempotency-Key</code> dan validasi baris.
      </p>
    </main>
  );
}

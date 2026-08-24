"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) });
      router.push("/jobs");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Mag-login</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Cellphone number">
            <Input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="09171234567" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" full disabled={busy}>
            {busy ? "Sandali lang…" : "Login"}
          </Button>
          <Link href="/forgot" className="block text-center text-sm font-semibold text-brand-800 underline">
            Nakalimutan ang password?
          </Link>
        </form>
      </Card>
      <p className="text-center text-sm text-gray-600">
        Wala ka pang account? <Link href="/register" className="font-bold text-brand-800 underline">Sign up — libre!</Link>
      </p>
    </div>
  );
}

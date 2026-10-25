"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/rsvp/fields";
import { getBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await getBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      // Message volontairement générique : ne révèle pas si le compte existe.
      setError("Identifiants incorrects.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TextField id="admin-email" label="Adresse e-mail" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        id="admin-password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error ?? undefined}
      />
      <Button type="submit" className="w-full" disabled={busy || !email || !password}>
        {busy ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="md"
      className={className}
      onClick={async () => {
        await getBrowserClient().auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Se déconnecter
    </Button>
  );
}

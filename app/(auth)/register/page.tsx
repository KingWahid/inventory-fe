"use client";

import { login, register } from "@/lib/api/auth";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { useAuthStore } from "@/stores/auth";
import { Alert, Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [tenantName, setTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.access_token, data.refresh_token);
      router.replace("/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (_, variables) => {
      loginMutation.mutate({
        email: variables.admin_email.trim().toLowerCase(),
        password: variables.password,
      });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (password !== passwordConfirm) {
      setLocalError("Konfirmasi password tidak cocok.");
      return;
    }
    registerMutation.mutate({
      tenant_name: tenantName.trim(),
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      password,
    });
  }

  const busy = registerMutation.isPending || loginMutation.isPending;

  const errorMessage =
    localError ??
    (registerMutation.isError
      ? userFacingApiMessage(registerMutation.error)
      : null) ??
    (loginMutation.isError ? userFacingApiMessage(loginMutation.error) : null);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Daftar tenant</h1>
      </div>

      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {errorMessage ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Terjadi kesalahan</Alert.Title>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <TextField fullWidth name="tenant_name" autoComplete="organization">
          <Label>Nama bisnis</Label>
          <Input
            placeholder="Acme Corp"
            value={tenantName}
            onChange={(ev) => setTenantName(ev.target.value)}
            disabled={busy}
          />
        </TextField>

        <TextField fullWidth name="admin_name" autoComplete="name">
          <Label>Nama admin</Label>
          <Input
            placeholder="Nama lengkap"
            value={adminName}
            onChange={(ev) => setAdminName(ev.target.value)}
            disabled={busy}
          />
        </TextField>

        <TextField fullWidth name="admin_email" type="email" autoComplete="email">
          <Label>Email</Label>
          <Input
            placeholder="nama@bisnis.test"
            value={adminEmail}
            onChange={(ev) => setAdminEmail(ev.target.value)}
            disabled={busy}
          />
        </TextField>

        <TextField fullWidth name="password" type="password" autoComplete="new-password">
          <Label>Password</Label>
          <Input
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={busy}
          />
        </TextField>

        <TextField fullWidth name="password_confirm" type="password" autoComplete="new-password">
          <Label>Konfirmasi password</Label>
          <Input
            placeholder="Ulangi password"
            value={passwordConfirm}
            onChange={(ev) => setPasswordConfirm(ev.target.value)}
            disabled={busy}
          />
        </TextField>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" variant="primary" isDisabled={busy}>
            {busy ? (
              <>
                <Spinner color="current" size="sm" />
                Memproses…
              </>
            ) : (
              "Daftar"
            )}
          </Button>
          <NextLink
            href="/login"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Masuk
          </NextLink>
        </div>
      </form>
    </div>
  );
}

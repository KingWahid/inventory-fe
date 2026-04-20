"use client";

import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { Link, useRouter } from "@/i18n/navigation";
import { login } from "@/lib/api/auth";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { useAuthStore } from "@/stores/auth";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.access_token, data.refresh_token);
      router.replace("/dashboard");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email: email.trim(), password });
  }

  const errorMessage =
    mutation.isError ? userFacingApiMessage(mutation.error) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {errorMessage ? (
          <ApiErrorAlert title={t("failTitle")}>{errorMessage}</ApiErrorAlert>
        ) : null}

        <TextField fullWidth name="email" type="email" autoComplete="email">
          <Label>{t("email")}</Label>
          <Input
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={mutation.isPending}
          />
        </TextField>

        <TextField fullWidth name="password" type="password" autoComplete="current-password">
          <Label>{t("password")}</Label>
          <Input
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={mutation.isPending}
          />
        </TextField>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" variant="primary" isDisabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner color="current" size="sm" />
                {t("processing")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
          <Link
            href="/register"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("registerLink")}
          </Link>
        </div>
      </form>
    </div>
  );
}

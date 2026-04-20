"use client";

import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { Link, useRouter } from "@/i18n/navigation";
import { login, register } from "@/lib/api/auth";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { useAuthStore } from "@/stores/auth";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");
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
      setLocalError(t("passwordMismatch"));
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
    <div className="fixed inset-0 z-50 bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-default-200 bg-[#fafbfc] lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-12">
          <div className="space-y-10">
            <p className="text-4xl font-semibold tracking-tight text-[#02395b]">
              {t("brand")}
            </p>
            <div className="max-w-md space-y-5">
              <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight text-[#0f172a]">
                {t("leftHeadlineTop")}{" "}
                <span className="text-[#006ea8]">{t("leftHeadlineAccent")}</span>
              </h1>
              <p className="text-lg leading-relaxed text-[#334155]">{t("leftSubhead")}</p>
            </div>
          </div>

        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-xl space-y-8">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-[#101214]">
                {t("heading")}
              </h2>
              <p className="mt-2 text-lg text-default-600">{t("subheading")}</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              {errorMessage ? (
                <ApiErrorAlert title={t("failTitle")}>{errorMessage}</ApiErrorAlert>
              ) : null}

              <TextField fullWidth name="tenant_name" autoComplete="organization">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                  {t("tenantName")}
                </Label>
                <Input
                  placeholder={t("tenantPlaceholder")}
                  value={tenantName}
                  onChange={(ev) => setTenantName(ev.target.value)}
                  disabled={busy}
                />
              </TextField>

              <TextField fullWidth name="admin_name" autoComplete="name">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                  {t("adminName")}
                </Label>
                <Input
                  placeholder={t("adminPlaceholder")}
                  value={adminName}
                  onChange={(ev) => setAdminName(ev.target.value)}
                  disabled={busy}
                />
              </TextField>

              <TextField fullWidth name="admin_email" type="email" autoComplete="email">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                  {t("email")}
                </Label>
                <Input
                  placeholder={t("emailPlaceholder")}
                  value={adminEmail}
                  onChange={(ev) => setAdminEmail(ev.target.value)}
                  disabled={busy}
                />
              </TextField>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  fullWidth
                  name="password"
                  type="password"
                  autoComplete="new-password"
                >
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                    {t("password")}
                  </Label>
                  <Input
                    placeholder={t("passwordHint")}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    disabled={busy}
                  />
                </TextField>

                <TextField
                  fullWidth
                  name="password_confirm"
                  type="password"
                  autoComplete="new-password"
                >
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                    {t("passwordConfirm")}
                  </Label>
                  <Input
                    placeholder={t("passwordRepeat")}
                    value={passwordConfirm}
                    onChange={(ev) => setPasswordConfirm(ev.target.value)}
                    disabled={busy}
                  />
                </TextField>
              </div>

              <Button
                type="submit"
                variant="primary"
                isDisabled={busy}
                className="mt-2 h-12 w-full rounded-md text-base font-semibold"
              >
                {busy ? (
                  <>
                    <Spinner color="current" size="sm" />
                    {t("processing")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </form>

            <div className="text-center text-lg text-default-600">
              <span>{t("loginHint")} </span>
              <Link href="/login" className="font-semibold text-[#02395b] hover:underline">
                {t("loginLink")}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-[0.18em] text-default-500">
              <span>{t("copyright")}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

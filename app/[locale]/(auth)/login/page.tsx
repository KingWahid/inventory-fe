"use client";

import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { login } from "@/lib/api/auth";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { useAuthStore } from "@/stores/auth";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
    <div className="fixed inset-0 z-50 bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#02395b] text-white lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-12">
          <p className="text-xl font-semibold tracking-tight">{t("brand")}</p>
          <div className="relative z-10 max-w-lg">
            <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight">
              {t("leftHeadline")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/80">
              {t("leftSubhead")}
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/70">
            {t("leftFooter")}
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="pointer-events-none absolute bottom-[16%] right-[10%] h-[58%] w-[38%] rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-sm" />
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-[#101214]">
                {t("welcomeTitle")}
              </h2>
              <p className="mt-2 text-sm text-default-600">{t("welcomeSubtitle")}</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              {errorMessage ? (
                <ApiErrorAlert title={t("failTitle")}>{errorMessage}</ApiErrorAlert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e3440]">
                    {t("password")}
                  </Label>
                  <span className="text-xs text-default-500">{t("forgot")}</span>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  disabled={mutation.isPending}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isDisabled={mutation.isPending}
                className="mt-2 h-12 w-full rounded-md text-base font-semibold"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </form>

            <div className="border-t border-default-200 pt-6 text-sm text-default-600">
              <span>{t("registerHint")} </span>
              <Link href="/register" className="font-semibold text-[#02395b] hover:underline">
                {t("registerLink")}
              </Link>
            </div>

            <div className="flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-default-500">
              <span>{t("copyright")}</span>
              <span>{t("legal")}</span>
              <span>{t("privacy")}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

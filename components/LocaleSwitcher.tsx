"use client";

import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden text-default-500 sm:inline">{t("label")}</span>
      <div className="flex rounded-md border border-default-200 bg-default-100 p-0.5 dark:border-default-100 dark:bg-default-50/10">
        {routing.locales.map((loc) => (
          <button
            key={loc}
            type="button"
            className={
              locale === loc
                ? "rounded bg-background px-2 py-1 font-semibold text-default-900 shadow-sm dark:bg-default-100/10 dark:text-default-50"
                : "rounded px-2 py-1 text-default-600 hover:text-default-900 dark:text-default-400 dark:hover:text-default-100"
            }
            onClick={() => router.replace(pathname, { locale: loc })}
          >
            {t(loc)}
          </button>
        ))}
      </div>
    </div>
  );
}

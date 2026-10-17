"use client";

import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "tr", label: "Türkçe" },
  { code: "pl", label: "Polski" },
  { code: "de", label: "Deutsch" },
];

export default function LocaleDropdown() {
  const [open, setOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = useLocale();

  const switchLocale = (locale: string) => {
    if (locale === currentLocale) {
      // setOpen(false);
      return;
    }

    setOpen(false);

    startTransition(() => {
      router.replace(pathname, {
        locale,
        scroll: false,
      });
    });
  };

  return (
    <>
      {/* PAGE OVERLAY DURING SWITCH */}
      <div
        className={`
          fixed inset-0 bg-white dark:bg-dark z-50
          transition-opacity duration-200 pointer-events-none
          ${isPending ? "opacity-40" : "opacity-0"}
        `}
      />

      <div className="relative">
        {/* BUTTON */}
        <button
          onClick={() => setOpen(!open)}
          className="
            bg-gray-100 dark:bg-dark-raised
            rounded-full px-3 py-2
            flex items-center gap-2
            transition
          "
        >
          <Globe className="w-4 h-4" />
          {currentLocale.toUpperCase()}
        </button>

        {/* DROPDOWN */}
        <div
          className={`
            absolute right-0 mt-2 w-44
            bg-white dark:bg-dark-card
            border border-gray-200 dark:border-neutral-700
            shadow-xl rounded-2xl overflow-hidden z-50
            transition-all duration-200 origin-top
            ${open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            }
          `}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`
                w-full px-4 py-3 text-left text-sm transition
                hover:bg-gray-100 dark:hover:bg-dark-raised
                ${currentLocale === lang.code
                  ? "font-semibold bg-gray-50 dark:bg-dark-raised"
                  : ""
                }
              `}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
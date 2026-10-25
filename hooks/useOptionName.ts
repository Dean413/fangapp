"use client";

// hooks/useOptionNames.ts
// tr("Tragic Past") -> "Pasado trágico" on the Spanish site; the saved name when there is no translation.
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

const cache = new Map<string, Record<string, string>>();
const pending = new Map<string, Promise<Record<string, string>>>();

function load(locale: string): Promise<Record<string, string>> {
    const known = cache.get(locale);
    if (known) return Promise.resolve(known);
    let request = pending.get(locale);
    if (!request) {
        request = fetch(`/api/option-names?locale=${encodeURIComponent(locale)}`)
            .then((res) => (res.ok ? res.json() : { names: {} }))
            .then((body) => {
                const names = (body?.names ?? {}) as Record<string, string>;
                cache.set(locale, names);
                return names;
            })
            .catch(() => ({} as Record<string, string>))
            .finally(() => pending.delete(locale));
        pending.set(locale, request);
    }
    return request;
}

export function useOptionNames() {
    const locale = useLocale();
    const [names, setNames] = useState<Record<string, string>>(cache.get(locale) ?? {});

    useEffect(() => {
        // English is the saved language: nothing to look up
        if (locale === "en") return;
        let alive = true;
        load(locale).then((n) => { if (alive) setNames(n); });
        return () => { alive = false; };
    }, [locale]);

    return (name: string | null | undefined): string => {
        if (!name) return "";
        return names[name.trim().toLowerCase()] ?? name;
    };
}
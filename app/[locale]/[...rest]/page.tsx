import { notFound } from "next/navigation";

// Catches any path under a valid locale that doesn't match a real route, so it renders inside
// LocaleLayout (NavBar etc.) and hits app/[locale]/not-found.tsx instead of skipping straight to
// the bare root fallback.
export default function CatchAll() {
    notFound();
}

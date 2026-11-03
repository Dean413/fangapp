import Link from "next/link";
import { BookX } from "lucide-react";

// Fallback for the rare case a URL doesn't even match the [locale] segment
// (app/[locale]/not-found.tsx handles everything else, including bad locales).
export default function NotFound() {
    return (
        <div className="bg-gray-50 dark:bg-dark min-h-screen flex items-center justify-center px-6">
            <div className="flex flex-col items-center text-center max-w-md">
                <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-2xl mb-6">
                    <BookX className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">404</h1>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-neutral-100 mb-2">Page not found</h2>
                <p className="text-gray-500 dark:text-neutral-400 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist, or may have moved.
                </p>
                <Link
                    href="/en"
                    className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

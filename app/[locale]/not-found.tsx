import { BookX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Footer from "@/components/footer";

export default async function NotFound() {
    const t = await getTranslations("NotFound");

    return (
        <div className="flex flex-col min-h-screen">
            <div className="bg-gray-50 dark:bg-dark flex-1 flex items-center justify-center px-6 py-24">
                <div className="flex flex-col items-center text-center max-w-md">
                    <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-2xl mb-6">
                        <BookX className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">404</h1>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-neutral-100 mb-2">{t("title")}</h2>
                    <p className="text-gray-500 dark:text-neutral-400 mb-8">{t("description")}</p>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition">
                            {t("home")}
                        </Link>
                        <Link
                            href="/stories"
                            className="rounded-full px-6 py-2.5 text-sm font-semibold text-gray-800 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-dark-raised transition">
                            {t("browse")}
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

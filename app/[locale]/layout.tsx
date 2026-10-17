import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { locales, type Locale } from "../../i18n/routing";
import NavBar from "@/components/navbar";
import Footer from "@/components/footer";
import AuthProvider from "@/lib/store/auth-provider";
import ModalRoot from "@/components/authCards/auth-modal";


export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate locale
    if (!locales.includes(locale as Locale)) notFound();

    // Load messages dynamically
    const messages = (await import(`../../messages/${locale}.json`)).default;


    return (

        <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider>
                <NavBar />
                {children}
                <ModalRoot />
                {/* <Footer /> */}
            </AuthProvider>

        </NextIntlClientProvider>


    );
}
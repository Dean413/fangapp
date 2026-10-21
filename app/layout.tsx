import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
// import Providers from "@/components/providers/theme-provider";
import { ThemeProvider } from "next-themes";
import ToastHost from "@/components/toast";
import { getLocale, getTranslations } from "next-intl/server";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: "FANG", description: t("description") };
}

export const viewport = {
  themeColor: "#1E3A8A",

};


export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  const locale = await getLocale();
  return (
    <html suppressHydrationWarning lang={locale} className={poppins.className}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          forcedTheme={undefined}>
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}

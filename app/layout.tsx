// import type { Metadata } from "next";
// import { Geist, Geist_Mono, Poppins } from "next/font/google";
// import "./globals.css";
// // import Providers from "@/components/providers/theme-provider";
// import { ThemeProvider } from "next-themes";
// import ToastHost from "@/components/toast";
// import { getLocale, getTranslations } from "next-intl/server";
// import ProtectContent from "@/components/protectContent";

// const poppins = Poppins({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
// });

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Meta");
//   return { title: "FANG", description: t("description") };
// }

// export const viewport = {
//   themeColor: "#1E3A8A",

// };


// export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
//   const locale = await getLocale();
//   return (
//     <html suppressHydrationWarning lang={locale} className={poppins.className}>
//       <body className="min-h-full flex flex-col">
//         <ProtectContent />
//         <ThemeProvider
//           attribute="class"
//           defaultTheme="system"
//           enableSystem
//           disableTransitionOnChange
//           forcedTheme={undefined}>
//           {children}
//           <ToastHost />
//         </ThemeProvider>
//       </body>
//     </html>
//   );
// }



import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// import Providers from "@/components/providers/theme-provider";
import { ThemeProvider } from "next-themes";
import ToastHost from "@/components/toast";
import { getLocale, getTranslations } from "next-intl/server";
import ProtectContent from "@/components/protectContent";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "any" }],
      shortcut: "/favicon.ico",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "FANG",
      type: "website",
    },
    other: {
      "google-adsense-account": "ca-pub-6932405185560645",
    },
  };
}

export const viewport = {
  themeColor: "#1E3A8A",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      className={poppins.className}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6932405185560645"
          crossOrigin="anonymous"
        />
      </head>

      <body className="min-h-full flex flex-col">
        <ProtectContent />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          forcedTheme={undefined}
        >
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}

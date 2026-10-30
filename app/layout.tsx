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
    metadataBase: new URL("https://fangapp.io"),
    title: t("title"),
    description: t("description"),
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://fangapp.io",
      siteName: "FANG",
      type: "website",
      images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "FANG" }],
    },

    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og-home.png"],
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

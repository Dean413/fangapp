import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import ThemedToastContainer from "@/components/themed-toast-container";
import "./globals.css";
// import Providers from "@/components/providers/theme-provider";
import { ThemeProvider } from "next-themes";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FANG",
  description: "A Reading website for everyone",
};

export const viewport = {
  themeColor: "#1E3A8A",

};


export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html suppressHydrationWarning lang="en" className={poppins.className}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          forcedTheme={undefined}>
          {children}
          <ThemedToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}

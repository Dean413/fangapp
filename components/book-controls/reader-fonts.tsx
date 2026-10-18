// components/book-controls/reader-fonts.ts
// Fonts a reader can pick for chapters (Display Options). Served from this site by next/font,
// and only downloaded when a reader actually picks one (preload off).
import { Literata, Lora, Merriweather, Nunito, Open_Sans, Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], display: "swap", preload: false });
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false });
const literata = Literata({ subsets: ["latin"], display: "swap", preload: false });

// className: for the font buttons in Display Options. family: the CSS font-family, forced on the chapter text.
export type ReaderFont = { id: string; label: string; className: string; family: string | null };

export const READER_FONTS: ReaderFont[] = [
    { id: "default", label: "Default", className: "", family: null },
    { id: "poppins", label: "Poppins", className: poppins.className, family: poppins.style.fontFamily },
    { id: "open-sans", label: "Open Sans", className: openSans.className, family: openSans.style.fontFamily },
    { id: "nunito", label: "Nunito", className: nunito.className, family: nunito.style.fontFamily },
    { id: "merriweather", label: "Merriweather", className: merriweather.className, family: merriweather.style.fontFamily },
    { id: "lora", label: "Lora", className: lora.className, family: lora.style.fontFamily },
    { id: "literata", label: "Literata", className: literata.className, family: literata.style.fontFamily },
];

export const readerFontClass = (id?: string) => READER_FONTS.find((f) => f.id === id)?.className ?? "";
export const readerFontFamily = (id?: string) => READER_FONTS.find((f) => f.id === id)?.family ?? null;
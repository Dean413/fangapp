"use client";

import { useState } from "react";
import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import { FaTiktok, FaXTwitter } from "react-icons/fa6";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

const SOCIALS = [
    { name: "X", href: "https://x.com/fangappio", Icon: FaXTwitter, hover: "hover:text-blue-500" },
    { name: "Instagram", href: "https://www.instagram.com/fangappio", Icon: FaInstagram, hover: "hover:text-pink-500" },
    { name: "Facebook", href: "https://www.facebook.com/fangappio", Icon: FaFacebook, hover: "hover:text-blue-600" },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/fangappio", Icon: FaLinkedin, hover: "hover:text-blue-600" },
    { name: "TikTok", href: "https://www.tiktok.com/@fangappio", Icon: FaTiktok, hover: "hover:text-pink-400" },
];

const Footer = () => {
    const t = useTranslations("Footer");
    // Phones: which section is open (one at a time)
    const [open, setOpen] = useState<string | null>(null);

    const sections = [
        {
            id: "genres",
            title: t("hotGenres"),
            links: [
                { href: "/stories?genre=romance", label: t("romance") },
                { href: "/stories?genre=fantasy", label: t("fantasy") },
                { href: "/stories?genre=mafia", label: t("mafia") },
                { href: "/stories?genre=billionaire", label: t("billionaire") },
                { href: "/stories?genre=werewolf", label: t("werewolf") },
            ],
        },
        {
            id: "company",
            title: t("company"),
            links: [
                { href: "/about", label: t("about") },
                { href: "/", label: t("contact") },
                { href: "/refund-policy", label: t("refundPolicy") },
                { href: "/dmca", label: t("dmca") },
            ],
        },
        {
            id: "support",
            title: t("support"),
            links: [
                { href: "/faq", label: t("faq") },
                { href: "/community-guidelines", label: t("community") },
                { href: "/cookie-policy", label: t("cookies") },
                { href: "/terms-of-service", label: t("terms") },
                { href: "/privacy-policy", label: t("privacy") },
            ],
        },
    ];

    const socialCircles = (
        <>
            {SOCIALS.map(({ name, href, Icon, hover }) => (
                <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-600 text-gray-300 md:h-11 md:w-11">
                    <Icon className={`h-5 w-5 transition ${hover}`} />
                </a>
            ))}
        </>
    );

    return (
        <footer className="bg-gray-950 dark:bg-black dark:border-t dark:border-dark-border text-white py-10 md:py-12 px-6">
            <div className="max-w-8xl mx-auto grid grid-cols-1 md:grid-cols-6 gap-6 md:gap-10">

                {/* Brand */}
                <div className="flex flex-col items-start text-left">
                    <div className="flex items-center">
                        <Image src="/fanglogo1.svg" alt="logo" width={80} height={80} className="w-12 md:w-10" />
                        <div
                            role="img"
                            aria-label="FANG"
                            className="-ml-4 w-24 md:w-20 aspect-1873/614 bg-white"
                            style={{
                                WebkitMask: "url(/fanglogo2.svg) center / contain no-repeat",
                                mask: "url(/fanglogo2.svg) center / contain no-repeat",
                            }}
                        />
                    </div>
                    <p className="mt-2 text-[#A3A3A3] text-lg md:text-base">{t("tagline")}</p>

                    {/* App Store / Google Play: ready for when the apps are live (uncomment) */}
                    {/* <div className="mt-5 flex gap-3">
                        <a href="#" className="flex h-16 w-44 flex-col items-center justify-center rounded-2xl border border-gray-600 transition hover:bg-gray-800">
                            <span className="text-[11px] uppercase text-gray-400">Download on</span>
                            <span className="text-lg font-semibold leading-tight">App Store</span>
                        </a>
                        <a href="#" className="flex h-16 w-44 flex-col items-center justify-center rounded-2xl border border-gray-600 transition hover:bg-gray-800">
                            <span className="text-[11px] uppercase text-gray-400">Get it on</span>
                            <span className="text-lg font-semibold leading-tight">Google Play</span>
                        </a>
                    </div> */}

                    {/* Social circles on desktop (phones have their own "Follow" block below) */}
                    <div className="mt-4 hidden max-w-40 flex-wrap gap-2 md:flex">{socialCircles}</div>
                </div>

                {/* Link sections: open/close rows on phones, plain lists on desktop */}
                {sections.map((s) => {
                    const isOpen = open === s.id;
                    return (
                        <div key={s.id} className="border-b border-gray-800 md:border-0">
                            <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : s.id)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center justify-between py-4 text-left md:pointer-events-none md:py-0 md:mb-4">
                                <h3 className="text-lg font-bold uppercase tracking-wide md:font-semibold">{s.title}</h3>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform md:hidden ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <ul className={`${isOpen ? "block" : "hidden"} space-y-3 pb-4 text-[#A3A3A3] md:block md:space-y-2 md:pb-0`}>
                                {s.links.map((l) => (
                                    <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                                ))}
                            </ul>
                        </div>
                    );
                })}

                {/* Phones: Follow */}
                <div className="md:hidden">
                    <h3 className="mb-4 text-lg font-bold tracking-wide">{t("follow")}</h3>
                    <div className="flex flex-wrap gap-3">{socialCircles}</div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="max-w-8xl mx-auto mt-8 md:mt-10 flex flex-col items-center gap-1 border-t border-gray-800 pt-6 text-center text-sm text-[#A3A3A3] md:flex-row md:justify-between md:text-xs">
                <p>{t("rights", { year: new Date().getFullYear() })}</p>
                <p>{t("poweredBy")}</p>
            </div>
        </footer>
    );
};

export default Footer;
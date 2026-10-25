"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import { Bell, ChevronDown, Menu, MoonStarIcon, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import LanguageChange from "./language-change";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import SearchBar from "./search-bar";
import { useTranslations } from "next-intl";
import { useDropDownStore } from "@/lib/store/dropDownStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import Swal from "sweetalert2";
import UnreadBadge from "@/components/unreadBadge";

// Genres live under /stories (genre list, a genre's books, book pages and the reader)
const GENRES_PATH = "/stories";
const NOTIFICATIONS_PATH = "/profile/notifications";
const WALLET_PATH = "/profile/wallet";

type VipPlan = "weekly" | "monthly" | null;

// The reader's photo; no photo (or it fails to load): their initial in a circle. VIP readers get their plan's crown at the bottom-right.
function Avatar({ src, name, plan = null }: { src?: string | null; name?: string | null; plan?: VipPlan }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    const initial = (name ?? "").trim().charAt(0).toUpperCase() || "R";
    return (
        <span className="relative inline-flex">
            {!src || failed ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-[#8B0000] to-[#D90404] text-sm font-bold text-white">
                    {initial}
                </span>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" onError={() => setFailed(true)} className="h-9 w-9 rounded-full object-cover" />
            )}
            {plan && (
                <Image src={plan === "monthly" ? "/fang_pictures/monthly-vip-crown.png" : "/fang_pictures/weekly-vip-crown.png"} alt="" aria-hidden="true" width={16} height={16}
                    className="pointer-events-none absolute -bottom-1 -right-1 h-4 w-4 object-contain drop-shadow" />
            )}
        </span>
    );
}

// Bell with the unread counter, opens the notifications page
function NotificationBell() {
    const t = useTranslations("NavBar");
    return (
        <Link href={NOTIFICATIONS_PATH} aria-label={t("Notifications")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-dark-border text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-dark-raised transition">
            <Bell size={17} />
            <UnreadBadge className="absolute -top-1.5 -right-1.5" />
        </Link>
    );
}

const NavBar = () => {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState("");
    const { resolvedTheme, setTheme } = useTheme();
    const isActive = (path: string) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
    const user = useAuthStore((s) => s.user);
    const { openSignIn, openSignUp, openForgotPassword, closeAll } = useAuthModals();
    const loading = useAuthStore((s) => s.loading);
    const { logout } = useAuthStore();
    const [logOutloading, setLogOutLoading] = useState(false);
    const [vipPlan, setVipPlan] = useState<VipPlan>(null);
    const userId = user?.id ?? null;

    useEffect(() => { setMounted(true); }, []);

    // VIP readers get their plan's crown on their picture (checked again when the page changes, so it shows right after buying)
    useEffect(() => {
        if (!userId) { setVipPlan(null); return; }
        let alive = true;
        fetch("/api/vip/status", { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!alive) return;
                const status = data?.vip ?? data;
                setVipPlan(status?.active ? (status.plan === "monthly" ? "monthly" : "weekly") : null);
            })
            .catch(() => { });
        return () => { alive = false; };
    }, [userId, pathname]);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open]);

    useEffect(() => {
        setOpen(false);
        // closeDropDown();
    }, [pathname]);

    // close mobile menu on route change / resize
    useEffect(() => {
        const handler = () => { if (window.innerWidth >= 768) setOpen(false); };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const t = useTranslations("NavBar");
    const isDark = mounted && resolvedTheme === "dark";

    const logOut = async () => {
        const result = await Swal.fire({
            title: t("logoutConfirmTitle"),
            text: t("logoutConfirmText"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: t("logoutConfirmButton"),
            cancelButtonText: t("cancel"),
        });

        if (!result.isConfirmed) return;

        try {
            setLogOutLoading(true);
            await logout();
            await Swal.fire({
                title: t("loggedOutTitle"),
                text: t("loggedOutText"),
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
            });

        } finally {
            setLogOutLoading(false);
        }
    };



    return (
        <>
            <nav className="w-full sticky top-0 z-30 shadow-md bg-white dark:bg-dark dark:shadow-none dark:border-b dark:border-dark-border">
                {/* ── TOPBAR ── */}
                <div className="flex w-[90%] mx-auto items-center justify-between py-3">
                    {/* LEFT: logo + desktop nav */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center">
                            <Image src="/fanglogo1.svg" alt="logo" width={80} height={80} className="w-10" />
                            <div
                                role="img"
                                aria-label="FANG"
                                className="-ml-4 w-15 md:w-20 aspect-1873/614 bg-black dark:bg-white"
                                style={{
                                    WebkitMask: "url(/fanglogo2.svg) center / contain no-repeat",
                                    mask: "url(/fanglogo2.svg) center / contain no-repeat",
                                }}
                            />
                        </div>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
                            <Link href="/" className={` transition ${isActive("/") ? "text-red-600" : "border-transparent"}`}>
                                {t("Home")}
                            </Link>

                            <Link href={GENRES_PATH} className={` transition ${isActive(GENRES_PATH) ? "text-red-600" : "border-transparent"}`}>
                                {t("Genres")}
                            </Link>
                            {/* <div className="relative group">
                                <button onMouseEnter={openDropDown} className="flex items-center gap-1">
                                    {t("Browse")}
                                    <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                                </button>
                                <div className="hidden group-hover:flex absolute top-full left-0 pt-3 z-50">
                                    {isDropDownOpen && <NavBarDropDown />}
                                </div>
                            </div> */}
                            <Link href="/rankings" className={`transition ${isActive("/rankings") ? "text-red-600" : "border-transparent"}`}>
                                {t("Rankings")}
                            </Link>
                            <a href="fangwriters.com" className={`transition ${isActive("/writer-arena") ? "text-red-600" : "border-transparent"}`}>
                                {t("WriterArena")}
                            </a>
                            <Link href="/library" className={` transition ${isActive("/library") ? "text-red-600" : "border-transparent"}`}>
                                {t("Library")}
                            </Link>


                        </div>
                    </div>

                    {/* RIGHT: search (desktop) + actions */}
                    <div className="flex items-center gap-3">
                        {/* Search — desktop only */}
                        <div className="hidden md:block">
                            <SearchBar value={search} onChange={setSearch} />
                        </div>

                        {/* Desktop auth + theme */}
                        <div className="hidden md:flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-3">
                                {user ? (
                                    <>
                                        {/* Coins (bought + bonus), opens the wallet */}
                                        <Link href={WALLET_PATH} aria-label={t("Wallet")}
                                            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                            <Image src="/fang_pictures/balance.png" alt="" width={18} height={18} />
                                            {((user.wallet?.coins ?? 0) + (user.wallet?.bonusCoins ?? 0)).toLocaleString()}
                                        </Link>
                                        <NotificationBell />
                                        <Link href="/profile" aria-label={t("Profile")} className="rounded-full">
                                            <Avatar src={user.avatar_url} name={user.username || user.full_name} plan={vipPlan} />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={openSignUp} className="cursor-pointer bg-[#D90404] text-white px-4 py-2 rounded-full text-sm hover:bg-red-700 transition">
                                            {t("SignUp")}
                                        </button>
                                    </>
                                )}
                            </div>

                            <LanguageChange />
                            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-2 cursor-pointer hidden lg:block rounded-full ${isDark ? "bg-dark border border-neutral-300" : "bg-gray-100 dark:bg-dark-raised"}`}>
                                {isDark ? <Sun size={20} /> : <MoonStarIcon size={20} />}
                            </button>

                            <button onClick={() => setOpen(!open)} aria-label={t("toggleMenu")} className="lg:hidden p-1">
                                {open ? <X size={26} /> : <Menu size={26} />}
                            </button>

                        </div>

                        {/* Mobile: theme toggle + hamburger */}
                        <div className="flex items-center gap-2 md:hidden">
                            {user && <NotificationBell />}
                            <LanguageChange />
                            <button
                                onClick={() => setOpen(!open)}
                                aria-label={t("toggleMenu")}
                                className="p-1"
                            >
                                {open ? <X size={26} className="dark:text-white text-black" /> : <Menu size={26} className="dark:text-white text-black" />}
                            </button>
                        </div>
                    </div>
                </div>



                {/* ── MOBILE MENU ── */}
                <div
                    className={`absolute h-[calc(100vh-50px)] top-full left-0 w-full dark:bg-dark bg-white text-black dark:text-white overflow-y-auto lg:hidden transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden origin-top
                    ${open
                            ? "max-h-[calc(100vh-60px)] opacity-100 translate-y-0 pointer-events-auto"
                            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                        }`}>

                    <div className="flex flex-col text-center text-base font-medium">
                        {/* Nav links */}
                        <Link href="/" onClick={() => setOpen(false)} className={`px-6 py-4 border-t hover:text-red-500 border-gray-100 dark:border-dark-border ${isActive("/") ? "text-red-600" : ""}`}>
                            {t("Home")}
                        </Link>
                        <Link href="/rankings" onClick={() => setOpen(false)} className={`px-6 py-4 hover:text-red-500 ${isActive("/rankings") ? "text-red-600" : ""}`}>
                            {t("Rankings")}
                        </Link>

                        <Link href={GENRES_PATH} onClick={() => setOpen(false)} className={`px-6 py-4 hover:text-red-500 ${isActive(GENRES_PATH) ? "text-red-600" : ""}`}>
                            {t("Genres")}
                        </Link>

                        {/* Genre accordion */}
                        {/* <button onClick={() => toggleDropDown()} className="flex justify-center  items-center px-6 py-4  w-full">
                            <p className={isDropDownOpen ? "text-[#D90404] text-center" : ""}>{t("Browse")}</p>
                            <ChevronDown size={16} className={`transition-transform text-gray-500 dark:text-neutral-400 ${isDropDownOpen ? "rotate-180 text-[#D90404]" : ""}`} />
                        </button> */}

                        {/* Genre accordion body */}
                        {/* <div className={`overflow-hidden transition-all duration-300 ${isDropDownOpen ? "max-h-196" : "max-h-0"}`}>
                            <NavBarDropDown />
                        </div> */}

                        <a href="fangwriters.com" onClick={() => setOpen(false)} className="px-6 py-4 hover:text-red-500">
                            {t("WriterArena")}
                        </a>
                        <Link href="/library" onClick={() => setOpen(false)} className={`px-6 py-4 hover:text-red-500 ${isActive("/library") ? "text-red-600" : ""}`}>
                            {t("Library")}
                        </Link>
                        {user && (
                            <>
                                <Link href="/profile/transaction-history" onClick={() => setOpen(false)} className="px-6 py-4 hover:text-red-500">
                                    {t("TransactionHistory")}
                                </Link>

                                <Link href="/profile/live-chat" onClick={() => setOpen(false)} className="px-6 py-4 hover:text-red-500">
                                    {t("LiveChat")}
                                </Link>

                                <Link href="/profile/settings" onClick={() => setOpen(false)} className="px-6 py-4 border-b hover:text-red-500 border-gray-100 dark:border-dark-border">
                                    {t("Settings")}
                                </Link>
                            </>
                        )}


                        <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`relative w-14 h-8 rounded-full mt-8 mx-auto transition-colors duration-300
                            ${isDark ? "bg-dark-raised" : "bg-gray-300 dark:bg-neutral-700"}`}>
                            {/* SLIDING CIRCLE */}
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300
                                ${isDark ? "left-7" : "left-1"}`}>
                                {isDark ? (<Sun size={14} className="text-yellow-500" />) : (<Moon size={14} className="text-zinc-700" />)}
                            </div>
                        </button>

                        {/* Auth buttons */}
                        <div >
                            {user ? (
                                <>
                                    <div className="flex items-center justify-between px-6 py-6 mt-1">
                                        <Link href="/profile" className="bg-linear-to-r from-[#8B0000] to-[#D90404] py-2 px-4 text-white font-bold rounded-xl">{t("Profile")}</Link>
                                        <button onClick={logOut} disabled={loading} className="text-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 mt-4 rounded-md px-4 py-3">
                                            {t("LogOut")}
                                        </button>
                                    </div>

                                </>
                            ) : (

                                <div className="flex items-center justify-between px-6 py-6 mt-1">
                                    <button onClick={openSignIn} className="text-gray-500 dark:text-neutral-400 font-medium">
                                        {t("SignIn")}
                                    </button>
                                    <button onClick={openSignUp} className="bg-[#D90404] text-white px-4 py-2.5 rounded-full text-sm font-medium">
                                        {t("SignUp")}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default NavBar;
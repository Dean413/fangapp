"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import {
    Bell, ChevronRight, Menu, MoonStarIcon, Search, X,
    User as UserIcon, Library as LibraryIcon, Wallet as WalletIcon, History as HistoryIcon,
    Users, Star, Settings as SettingsIcon, MessageSquare, LogOut as LogOutIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import LanguageChange from "./language-change";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import SearchBar from "./search-bar";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";
import Swal from "sweetalert2";
import UnreadBadge from "@/components/unreadBadge";

// Genres live under /stories (genre list, a genre's books, book pages and the reader)
const GENRES_PATH = "/stories";
const NOTIFICATIONS_PATH = "/profile/notifications";
const WALLET_PATH = "/profile/wallet";

type VipPlan = "weekly" | "monthly" | null;

const crownFor = (plan: Exclude<VipPlan, null>) =>
    plan === "monthly" ? "/fang_pictures/monthly-vip-crown.png" : "/fang_pictures/weekly-vip-crown.png";

// The reader's photo; no photo (or it fails to load): their initial in a circle. VIP readers get their plan's crown at the bottom-right.
// big = the larger picture in the account panel (no crown there, the panel has its own VIP pill)
function Avatar({ src, name, plan = null, big = false }: { src?: string | null; name?: string | null; plan?: VipPlan; big?: boolean }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    const initial = (name ?? "").trim().charAt(0).toUpperCase() || "R";
    const size = big ? "h-14 w-14" : "h-9 w-9";
    return (
        <span className="relative inline-flex shrink-0">
            {!src || failed ? (
                <span className={`flex ${size} items-center justify-center rounded-full bg-linear-to-br from-[#8B0000] to-[#D90404] ${big ? "text-xl" : "text-sm"} font-bold text-white`}>
                    {initial}
                </span>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" onError={() => setFailed(true)} className={`${size} rounded-full object-cover`} />
            )}
            {plan && !big && (
                <Image src={crownFor(plan)} alt="" aria-hidden="true" width={16} height={16}
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
    const [accountOpen, setAccountOpen] = useState(false);
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
    const [summary, setSummary] = useState({ booksRead: 0, following: 0 });
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

    // The panel's numbers, from the same endpoints the profile page uses, fetched each time the panel opens
    useEffect(() => {
        if (!userId || !accountOpen) return;
        let alive = true;
        const read = (url: string) =>
            fetch(url, { credentials: "include", cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).catch(() => null);
        Promise.all([read("/api/reading-stats?range=year"), read("/api/authors/following")]).then(([stats, following]) => {
            if (!alive) return;
            setSummary({ booksRead: Number(stats?.totalBooks) || 0, following: Number(following?.total) || 0 });
        });
        return () => { alive = false; };
    }, [userId, accountOpen]);

    useEffect(() => {
        if (open || accountOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open, accountOpen]);

    useEffect(() => {
        setOpen(false);
        setAccountOpen(false);
        // closeDropDown();
    }, [pathname]);

    // close mobile menu on route change / resize
    useEffect(() => {
        const handler = () => { if (window.innerWidth >= 768) { setOpen(false); setAccountOpen(false); } };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const t = useTranslations("NavBar");
    const isDark = mounted && resolvedTheme === "dark";

    // Reading and following aren't recorded yet, so these start at 0 (same as the profile page)
    const stats = [
        { value: summary.booksRead, label: t("booksRead") },
        { value: summary.following, label: t("following") },
    ];

    // The rows of the mobile account panel
    const accountLinks = [
        { href: "/profile", label: t("Profile"), icon: UserIcon, exact: true },
        { href: "/library", label: t("Library"), icon: LibraryIcon },
        { href: WALLET_PATH, label: t("Wallet"), icon: WalletIcon },
        { href: "/profile/transaction-history", label: t("TransactionHistory"), icon: HistoryIcon },
        { href: "/profile/community", label: t("Community"), icon: Users },
        { href: NOTIFICATIONS_PATH, label: t("Notifications"), icon: Bell, badge: true },
        { href: "/profile/reviews", label: t("MyReviews"), icon: Star },
        { href: "/profile/settings", label: t("Settings"), icon: SettingsIcon },
        { href: "/profile/live-chat", label: t("LiveChat"), icon: MessageSquare },
    ];

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
                        <Link href="/" className="flex items-center">
                            <Image src="/fanglogo1.svg" alt="" width={80} height={80} className="w-10" />
                            <div
                                role="img"
                                aria-label="FANG"
                                className="-ml-4 w-15 md:w-20 aspect-1873/614 bg-black dark:bg-white"
                                style={{
                                    WebkitMask: "url(/fanglogo2.svg) center / contain no-repeat",
                                    mask: "url(/fanglogo2.svg) center / contain no-repeat",
                                }}
                            />
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
                            <Link href="/" className={` transition ${isActive("/") ? "text-red-600" : "border-transparent"}`}>
                                {t("Home")}
                            </Link>

                            <Link href={GENRES_PATH} className={` transition ${isActive(GENRES_PATH) ? "text-red-600" : "border-transparent"}`}>
                                {t("Genres")}
                            </Link>
                            <Link href="/rankings" className={`transition ${isActive("/rankings") ? "text-red-600" : "border-transparent"}`}>
                                {t("Rankings")}
                            </Link>
                            <a href="https://www.fangwriters.com" className={`transition ${isActive("/writer-arena") ? "text-red-600" : "border-transparent"}`}>
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
                                        {/* Coins (bought + bonus + VIP bonus), opens the wallet */}
                                        <Link href={WALLET_PATH} aria-label={t("Wallet")}
                                            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                            <Image src="/fang_pictures/balance.png" alt="" width={18} height={18} />
                                            {((user.wallet?.coins ?? 0) + (user.wallet?.bonusCoins ?? 0) + (user.wallet?.vipBonusCoins ?? 0)).toLocaleString()}
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

                        {/* Mobile: language, theme, then the account button (signed in) or the menu button (guests) */}
                        <div className="flex items-center gap-2 md:hidden">
                            <LanguageChange />
                            <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={t("toggleTheme")} className="p-1.5">
                                {isDark ? <Sun size={22} className="text-white" /> : <MoonStarIcon size={22} className="text-black" />}
                            </button>
                            {user ? (
                                <button
                                    onClick={() => setAccountOpen(true)}
                                    aria-label={t("myAccount")}
                                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-red-500 text-red-500"
                                >
                                    <UserIcon size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setOpen(!open)}
                                    aria-label={t("toggleMenu")}
                                    className="p-1"
                                >
                                    {open ? <X size={26} className="dark:text-white text-black" /> : <Menu size={26} className="dark:text-white text-black" />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>



                {/* ── MOBILE MENU (guests) ── */}
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

                        <a href="https://www.fangwriters.com" onClick={() => setOpen(false)} className="px-6 py-4 hover:text-red-500">
                            {t("WriterArena")}
                        </a>
                        <Link href="/library" onClick={() => setOpen(false)} className={`px-6 py-4 hover:text-red-500 ${isActive("/library") ? "text-red-600" : ""}`}>
                            {t("Library")}
                        </Link>

                        {/* Auth buttons */}
                        <div className="flex items-center justify-between px-6 py-6 mt-1">
                            <button onClick={openSignIn} className="text-gray-500 dark:text-neutral-400 font-medium">
                                {t("SignIn")}
                            </button>
                            <button onClick={openSignUp} className="bg-[#D90404] text-white px-4 py-2.5 rounded-full text-sm font-medium">
                                {t("SignUp")}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── MOBILE ACCOUNT PANEL (signed in) ── */}
            {user && (
                <div className={`fixed inset-0 z-60 md:hidden ${accountOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
                    <div
                        onClick={() => setAccountOpen(false)}
                        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${accountOpen ? "opacity-100" : "opacity-0"}`}
                    />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-hidden={!accountOpen}
                        aria-label={t("myAccount")}
                        className={`absolute right-0 top-0 h-full w-[80%] max-w-sm overflow-y-auto bg-white dark:bg-dark text-black dark:text-white shadow-xl transition-transform duration-300 ${accountOpen ? "translate-x-0" : "translate-x-full"}`}
                    >
                        {/* Title + close */}
                        <div className="flex items-center justify-between px-5 pt-6 pb-4">
                            <h2 className="text-xl font-bold">{t("myAccount")}</h2>
                            <button
                                type="button"
                                onClick={() => setAccountOpen(false)}
                                aria-label={t("closeMenu")}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-raised"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Who */}
                        <div className="flex items-center gap-3 px-5 pb-5">
                            <Avatar src={user.avatar_url} name={user.username || user.full_name} big />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-serif text-xl font-bold">{user.full_name}</p>
                                {user.username && (
                                    <p className="truncate text-sm text-gray-500 dark:text-neutral-400">@{user.username}</p>
                                )}
                            </div>
                            {vipPlan && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                                    <Image src={crownFor(vipPlan)} alt="" aria-hidden="true" width={16} height={16} className="h-4 w-4 object-contain" />
                                    {t("vip")}
                                </span>
                            )}
                        </div>

                        {/* Numbers */}
                        <div className="mx-5 grid grid-cols-2 border-t border-gray-100 dark:border-dark-border py-4 text-center">
                            {stats.map((s) => (
                                <div key={s.label}>
                                    <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 dark:text-neutral-400">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Pages */}
                        <nav className="space-y-1 border-t border-gray-100 dark:border-dark-border px-3 py-3">
                            {accountLinks.map((l) => {
                                const current = l.exact ? pathname === l.href : isActive(l.href);
                                return (
                                    <Link
                                        key={l.href}
                                        href={l.href}
                                        onClick={() => setAccountOpen(false)}
                                        className={`relative flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] transition ${current ? "bg-red-50 font-semibold text-red-600 dark:bg-red-500/10" : "text-gray-800 hover:bg-gray-50 dark:text-neutral-200 dark:hover:bg-dark-raised"}`}
                                    >
                                        {current && <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-red-600" />}
                                        <l.icon size={20} className="shrink-0" />
                                        <span className="flex-1">{l.label}</span>
                                        {l.badge && <UnreadBadge />}
                                        <ChevronRight size={16} className="shrink-0 text-gray-400" />
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Log out */}
                        <div className="border-t border-gray-100 dark:border-dark-border px-3 py-3">
                            <button
                                type="button"
                                onClick={() => { setAccountOpen(false); logOut(); }}
                                disabled={logOutloading || loading}
                                className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] text-gray-500 transition hover:bg-gray-50 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-dark-raised"
                            >
                                <LogOutIcon size={20} className="shrink-0" />
                                {t("LogOut")}
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
};

export default NavBar;
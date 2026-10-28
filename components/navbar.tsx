"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import {
    Bell, ChevronRight, Menu, MoonStarIcon, X, type LucideIcon,
    User as UserIcon, Library as LibraryIcon, Wallet as WalletIcon, History as HistoryIcon,
    Users, Star, Settings as SettingsIcon, MessageSquare, LogOut as LogOutIcon,
    Home as HomeIcon, Trophy, LayoutGrid, PenLine, Search as SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import LanguageChange from "./language-change";
import { Sun } from "lucide-react";
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
const SEARCH_PATH = "/search";

type VipPlan = "weekly" | "monthly" | null;

// One row of the phone menus
type PanelRow = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: boolean; external?: boolean };

const crownFor = (plan: Exclude<VipPlan, null>) =>
    plan === "monthly" ? "/fang_pictures/monthly-vip-crown.png" : "/fang_pictures/weekly-vip-crown.png";

// The reader's photo; no photo (or it fails to load): their initial in a circle. VIP readers get their plan's crown at the bottom-right.
// big = the larger picture in the account sheet (no crown there, the sheet has its own VIP pill)
function Avatar({ src, name, plan = null, big = false }: { src?: string | null; name?: string | null; plan?: VipPlan; big?: boolean }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    const initial = (name ?? "").trim().charAt(0).toUpperCase() || "R";
    const size = big ? "h-16 w-16" : "h-9 w-9";
    return (
        <span className="relative inline-flex shrink-0">
            {!src || failed ? (
                <span className={`flex ${size} items-center justify-center rounded-full bg-linear-to-br from-[#8B0000] to-[#D90404] ${big ? "text-2xl" : "text-sm"} font-bold text-white`}>
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

// The FANG logo (used in the top bar and at the top of the menu drawer)
function Logo() {
    return (
        <>
            <Image src="/fanglogo1.svg" alt="" width={80} height={80} className="w-10" />
            <div
                role="img"
                aria-label="FANG"
                className="-ml-4 w-20 md:w-20 aspect-1873/614 bg-black dark:bg-white"
                style={{
                    WebkitMask: "url(/fanglogo2.svg) center / contain no-repeat",
                    mask: "url(/fanglogo2.svg) center / contain no-repeat",
                }}
            />
        </>
    );
}

const NavBar = () => {
    const pathname = usePathname();
    // Phones: "nav" = the menu drawer (hamburger), "account" = the My Account sheet (avatar)
    const [panel, setPanel] = useState<"nav" | "account" | null>(null);
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState("");
    const { resolvedTheme, setTheme } = useTheme();
    const isActive = (path: string) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
    // Phones: the search bar under the top bar shows only where readers look for books (home, genres, the reader)
    const segments = pathname.split("/").filter(Boolean);
    const showSearch = pathname === "/" || segments[0] === "library" || (segments[0] === "stories" && (segments.length <= 2 || segments[segments.length - 1] === "reader"));
    const user = useAuthStore((s) => s.user);
    const { openSignIn, openSignUp, openForgotPassword, closeAll } = useAuthModals();
    const loading = useAuthStore((s) => s.loading);
    const { logout } = useAuthStore();
    const [logOutloading, setLogOutLoading] = useState(false);
    const [vipPlan, setVipPlan] = useState<VipPlan>(null);
    const [summary, setSummary] = useState({ booksRead: 0, following: 0 });
    const userId = user?.id ?? null;
    // Coins bought + bonus coins + VIP bonus coins that haven't expired
    const balance = (user?.wallet?.coins ?? 0) + (user?.wallet?.bonusCoins ?? 0) + (user?.wallet?.vipBonusCoins ?? 0);

    useEffect(() => { setMounted(true); }, []);

    // Signing in or out closes whatever is open
    useEffect(() => { setPanel(null); }, [userId]);

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

    // The account sheet's numbers, from the same endpoints the profile page uses, fetched each time it opens
    useEffect(() => {
        if (!userId || panel !== "account") return;
        let alive = true;
        const read = (url: string) =>
            fetch(url, { credentials: "include", cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).catch(() => null);
        Promise.all([read("/api/reading-stats?range=year"), read("/api/authors/following")]).then(([stats, following]) => {
            if (!alive) return;
            setSummary({ booksRead: Number(stats?.totalBooks) || 0, following: Number(following?.total) || 0 });
        });
        return () => { alive = false; };
    }, [userId, panel]);

    useEffect(() => {
        document.body.style.overflow = panel ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [panel]);

    useEffect(() => {
        setPanel(null);
    }, [pathname]);

    // close the phone menus when the screen gets wide enough for the desktop bar
    useEffect(() => {
        const handler = () => { if (window.innerWidth >= 1024) setPanel(null); };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const t = useTranslations("NavBar");
    const isDark = mounted && resolvedTheme === "dark";

    const stats = [
        { value: summary.booksRead, label: t("booksRead") },
        { value: summary.following, label: t("following") },
    ];

    // The menu drawer (hamburger)
    const publicLinks: PanelRow[] = [
        { href: "/", label: t("Home"), icon: HomeIcon, exact: true },
        { href: GENRES_PATH, label: t("Genres"), icon: LayoutGrid },
        { href: "/rankings", label: t("Rankings"), icon: Trophy },
        { href: "https://fangwriters.com", label: t("WriterArena"), icon: PenLine, external: true },
        { href: "/library", label: t("Library"), icon: LibraryIcon },

    ];

    // The My Account sheet (avatar)
    const accountLinks: PanelRow[] = [
        { href: "/profile", label: t("Profile"), icon: UserIcon, exact: true },
        { href: WALLET_PATH, label: t("Wallet"), icon: WalletIcon },
        { href: "/profile/transaction-history", label: t("TransactionHistory"), icon: HistoryIcon },
        { href: "/profile/community", label: t("Community"), icon: Users },
        { href: NOTIFICATIONS_PATH, label: t("Notifications"), icon: Bell, badge: true },
        { href: "/profile/reviews", label: t("MyReviews"), icon: Star },
        { href: "/profile/settings", label: t("Settings"), icon: SettingsIcon },
        { href: "/profile/live-chat", label: t("LiveChat"), icon: MessageSquare },
    ];

    // One row (same look in the drawer and the sheet)
    const renderRow = (l: PanelRow) => {
        const current = !l.external && (l.exact ? pathname === l.href : isActive(l.href));
        const className = `relative flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] transition ${current ? "bg-red-50 font-semibold text-red-600 dark:bg-red-500/10" : "text-gray-800 hover:bg-gray-50 dark:text-neutral-200 dark:hover:bg-dark-raised"}`;
        const inner = (
            <>
                {current && <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-red-600" />}
                <l.icon size={20} className="shrink-0" />
                <span className="flex-1">{l.label}</span>
                {l.badge && <UnreadBadge />}
                <ChevronRight size={16} className={`shrink-0 ${current ? "text-red-600" : "text-gray-400"}`} />
            </>
        );
        return l.external ? (
            <a key={l.href} href={l.href} onClick={() => setPanel(null)} className={className}>{inner}</a>
        ) : (
            <Link key={`${l.href}-${l.label}`} href={l.href} onClick={() => setPanel(null)} className={className}>{inner}</Link>
        );
    };

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
        <nav className="w-full sticky top-0 z-30 shadow-md bg-white dark:bg-dark dark:shadow-none dark:border-b dark:border-dark-border">
            {/* ── TOPBAR ── */}
            <div className="flex w-[90%] mx-auto items-center justify-between py-3">
                {/* LEFT: hamburger (phones and tablets) + logo + desktop nav */}
                <div className="flex items-center gap-3 md:gap-8">
                    <button
                        type="button"
                        onClick={() => setPanel("nav")}
                        aria-label={t("toggleMenu")}
                        className="lg:hidden p-1"
                    >
                        <Menu size={26} />
                    </button>

                    <Link href="/" className="flex items-center">
                        <Logo />
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
                        <a
                            href="https://fangwriters.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition border-transparent">
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

                    {/* Tablet and desktop auth + theme */}
                    <div className="hidden md:flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-3">
                            {user ? (
                                <>
                                    {/* Coins (bought + bonus + VIP bonus), opens the wallet */}
                                    <Link href={WALLET_PATH} aria-label={t("Wallet")}
                                        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                        <Image src="/fang_pictures/balance.png" alt="" width={18} height={18} />
                                        {balance.toLocaleString()}
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
                    </div>

                    {/* Phones: Sign up (guests), language, theme, then the avatar (opens My Account) */}
                    <div className="flex items-center gap-2 md:hidden">
                        {/* {!user && (
                            <button onClick={openSignUp} className="rounded-full bg-[#D90404] px-4 py-2 text-sm font-medium text-white">
                                {t("SignUp")}
                            </button>
                        )} */}
                        <LanguageChange />
                        <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={t("toggleTheme")} className="p-1.5">
                            {isDark ? <Sun size={22} className="text-white" /> : <MoonStarIcon size={22} className="text-black" />}
                        </button>
                        {user && (
                            <button
                                type="button"
                                onClick={() => setPanel(panel === "account" ? null : "account")}
                                aria-label={t("myAccount")}
                                className="rounded-full"
                            >
                                <Avatar src={user.avatar_url} name={user.username || user.full_name} plan={vipPlan} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Phones: search under the top bar, only on the pages where readers look for books */}
            {showSearch && panel === null && (<div className="mx-auto w-[90%] pb-3 md:hidden"><SearchBar value={search} onChange={setSearch} /></div>)}

            {/* ── MENU DRAWER (hamburger): slides in from the left over the whole screen ── */}
            {panel === "nav" && (
                <div className="fixed inset-0 z-60 lg:hidden">
                    <div onClick={() => setPanel(null)} className="absolute inset-0 bg-black/40" />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("toggleMenu")}
                        className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto rounded-r-3xl bg-white dark:bg-dark text-black dark:text-white shadow-xl"
                    >
                        {/* Logo + close */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4">
                            <Link href="/" onClick={() => setPanel(null)} className="flex items-center">
                                <Logo />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setPanel(null)}
                                aria-label={t("closeMenu")}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-raised"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <nav className="space-y-1 px-3 pb-2">
                            {publicLinks.map(renderRow)}
                        </nav>

                        {/* Guests: Sign up at the bottom */}
                        {!user && (
                            <div className="mt-auto px-5 pb-6 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setPanel(null); openSignUp(); }}
                                    className="w-full rounded-full bg-[#D90404] py-3 text-sm font-semibold text-white hover:bg-red-700"
                                >
                                    {t("SignUp")}
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {/* ── MY ACCOUNT SHEET (avatar, signed in): under the top bar ── */}
            {panel === "account" && user && (
                <div className="absolute left-0 top-full w-full lg:hidden">
                    <div onClick={() => setPanel(null)} className="absolute left-0 top-0 h-dvh w-full bg-black/40" />

                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("myAccount")}
                        className="relative max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-t-3xl bg-white dark:bg-dark text-black dark:text-white shadow-xl"
                    >
                        {/* Title + close */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-4">
                            <h2 className="text-xl font-bold">{t("myAccount")}</h2>
                            <button
                                type="button"
                                onClick={() => setPanel(null)}
                                aria-label={t("closeMenu")}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-raised"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Who */}
                        <div className="flex items-center gap-4 px-5 pb-4">
                            <Avatar src={user.avatar_url} name={user.username || user.full_name} big />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="truncate font-serif text-xl font-bold">{user.full_name}</p>
                                    {vipPlan && (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                                            {t("vip")}
                                            <Image src={crownFor(vipPlan)} alt="" aria-hidden="true" width={16} height={16} className="h-4 w-4 object-contain" />
                                        </span>
                                    )}
                                </div>
                                {user.username && (
                                    <p className="truncate text-sm text-gray-500 dark:text-neutral-400">@{user.username}</p>
                                )}
                                <Link
                                    href={WALLET_PATH}
                                    onClick={() => setPanel(null)}
                                    aria-label={t("Wallet")}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                    <Image src="/fang_pictures/balance.png" alt="" width={18} height={18} />
                                    {balance.toLocaleString()}
                                </Link>
                            </div>
                        </div>

                        {/* Numbers */}
                        <div className="grid grid-cols-2 px-5 pb-4 text-center">
                            {stats.map((s) => (
                                <div key={s.label}>
                                    <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 dark:text-neutral-400">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Account pages */}
                        <nav className="space-y-1 px-3 pb-2">
                            {accountLinks.map(renderRow)}
                        </nav>

                        {/* Log out */}
                        <div className="mx-3 border-t border-gray-100 dark:border-dark-border py-3">
                            <button
                                type="button"
                                onClick={() => { setPanel(null); logOut(); }}
                                disabled={logOutloading || loading}
                                className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] text-gray-500 transition hover:bg-gray-50 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-dark-raised"
                            >
                                <LogOutIcon size={20} className="shrink-0" />
                                {t("LogOut")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default NavBar;
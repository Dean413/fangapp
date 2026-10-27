"use client";

import SettingRow from "@/components/profile-components/settings/settings-row";
import SettingsSection from "@/components/profile-components/settings/settings-section";
import ToggleSwitch from "@/components/profile-components/settings/toggle-switch";
import {
    ChangeEmailDialog,
    ChangePasswordDialog,
    DeleteAccountDialog,
    NotificationsDialog,
    TwoFactorDialog,
    type NotificationSettings,
} from "@/components/profile-components/settings/settingsDialog";
import EditProfileCard from "@/components/editProfileCard";
import { useAuthStore } from "@/lib/store/authStore";
import { useLibraryStore } from "@/lib/store/library-store";
import LanguageChange from "@/components/language-change";
import { MessageSquareText, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "@/lib/store/toastStore";
import { FaFacebookF, FaFile, FaShieldHalved, FaUserPen, FaUserShield } from "react-icons/fa6";
import { FiLifeBuoy, FiLink } from "react-icons/fi";
import { FaApple, FaComment, FaInfoCircle, FaQuestionCircle } from "react-icons/fa";
import { useLocale, useTranslations } from "next-intl";
import AutoRenewRow from "@/components/profile-components/settings/auto-renew-row";
import TwoFactorCard from "@/components/authCards/twoFactorCards";
import { startAppleSignIn } from "@/app/api/auth/apple/apple-client";

type T = (key: string, values?: Record<string, string | number>) => string;

type Provider = "google" | "facebook" | "apple";
const PROVIDER_NAMES: Record<Provider, string> = { google: "Google", facebook: "Facebook", apple: "Apple" };

type AccountSettings = {
    email: string;
    username: string | null;
    joinedAt: string | null;
    hasPassword: boolean;
    passwordChangedAt: string | null;
    twoFactor: boolean;
    isWriter: boolean;
    providers: Record<Provider, boolean>;
    notifications: NotificationSettings;

};


const formatDate = (iso: string | null, locale: string) =>
    iso ? new Date(iso).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }) : "—";

// "Changed 3 months ago"
function changedAgo(iso: string | null, locale: string, t: T) {
    if (!iso) return t("set");
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return t("changedAgo", { when: rtf.format(Math.round(seconds / size), unit) });
    }
    return t("changedJustNow");
}

const actionClass = "text-red-500 font-medium cursor-pointer";

export default function SettingsPage() {
    const router = useRouter();
    const t = useTranslations("Settings");
    const c = useTranslations("Common");
    const locale = useLocale();
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const user = useAuthStore((s) => s.user);
    const fetchUser = useAuthStore((s) => s.fetchUser);
    const setUser = useAuthStore((s) => s.setUser);

    const [settings, setSettings] = useState<AccountSettings | null>(null);
    const [dialog, setDialog] = useState<null | "profile" | "password" | "email" | "twoFactor" | "delete" | "notifications">(null);
    const [twoFactorTarget, setTwoFactorTarget] = useState(false);
    const unlinking = useRef<Provider | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/settings", { credentials: "include", cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.settings) setSettings(data.settings);
        } catch {
            // keep what's shown
        }
    }, []);

    useEffect(() => {
        if (user?.id) load();
    }, [user?.id, load]);

    // Back from connecting Google / Facebook: say it worked (errors are shown by the sign-in messages)
    useEffect(() => {
        const url = new URL(window.location.href);
        const linked = url.searchParams.get("linked") as Provider | null;
        if (!linked) return;
        if (!url.searchParams.get("auth_error") && PROVIDER_NAMES[linked]) toast.success(t("connectedToast", { provider: PROVIDER_NAMES[linked] }));
        url.searchParams.delete("linked");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, []);

    // Connect: Google/Facebook use the provider's sign-in page; Apple opens its popup. Both come back here in "link" mode
    const connect = (provider: Provider) => {
        const next = `${pathname}?linked=${provider}`;
        if (provider === "apple") {
            startAppleSignIn(next, true);
            return;
        }
        window.location.href = `/api/auth/${provider}/login?link=1&next=${encodeURIComponent(next)}`;
    };

    const disconnect = async (provider: Provider) => {
        if (unlinking.current) return;
        unlinking.current = provider;
        try {
            const res = await fetch("/api/settings/social", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ provider }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("disconnectFailed"));
                return;
            }
            toast.success(t("disconnectedToast", { provider: PROVIDER_NAMES[provider] }));
            await load();
        } catch {
            toast.error(c("networkError"));
        } finally {
            unlinking.current = null;
        }
    };

    const toggleProvider = (provider: Provider) => {
        if (!settings) return;
        if (settings.providers[provider]) disconnect(provider);
        else connect(provider);
    };

    const openTwoFactor = () => {
        if (!settings) return;
        if (!settings.hasPassword) {
            toast.info(t("setPasswordFor2fa"));
            setDialog("password");
            return;
        }
        setTwoFactorTarget(!settings.twoFactor);
        setDialog("twoFactor");
    };

    const afterDelete = () => {
        setDialog(null);
        setUser(null);
        useLibraryStore.getState().reset();
        router.push("/");
    };

    const isDark = mounted && resolvedTheme === "dark";
    const s = settings;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="text-gray-500 dark:text-neutral-400">{t("subtitle")}</p>
            </div>

            <SettingsSection title={t("account")} icon={<FaUserPen size={20} color="red" />}>
                <SettingRow
                    title={t("username")}
                    description={s ? (s.username ? `@${s.username}` : t("notSet")) : "…"}
                    action={<button type="button" onClick={() => setDialog("profile")} className={actionClass}>{t("edit")}</button>}
                />

                <SettingRow
                    title={t("email")}
                    description={s?.email ?? user?.email ?? "…"}
                    action={<button type="button" onClick={() => setDialog("email")} disabled={!s} className={actionClass}>{t("edit")}</button>}
                />

                <SettingRow
                    title={t("joined")}
                    description={s ? formatDate(s.joinedAt, locale) : "…"}
                    action={<span className="text-gray-400 text-sm">{t("readOnly")}</span>}
                />
            </SettingsSection>

            <TwoFactorCard />

            <SettingsSection title={t("security")} icon={<FaShieldHalved color="red" size={20} />}>
                <SettingRow
                    title={t("password")}
                    description={s ? (s.hasPassword ? changedAgo(s.passwordChangedAt, locale, t) : t("passwordNotSet")) : "…"}
                    action={
                        <button type="button" onClick={() => setDialog("password")} disabled={!s} className={actionClass}>
                            {s && !s.hasPassword ? t("set") : t("change")}
                        </button>
                    }
                />

                <SettingRow
                    title={t("twoFactor")}
                    description={t("twoFactorText")}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.twoFactor)}
                            onChange={openTwoFactor}
                        />
                    }
                />

                <SettingRow
                    title={t("deleteAccount")}
                    description={t("deleteAccountText")}
                    action={
                        <button type="button" onClick={() => setDialog("delete")} disabled={!s} className="border border-red-500 text-red-500 px-4 py-1 rounded-full">
                            {c("delete")}
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title={t("social")} icon={<FiLink size={20} color="red" />}>
                <SettingRow
                    title="Google" icon={<Image src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" width={20} height={20} unoptimized className="w-5" />}
                    description={s ? (s.providers.google ? t("connected") : t("notConnected")) : "…"}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.providers.google)}
                            onChange={() => toggleProvider("google")}
                        />
                    }
                />

                <SettingRow icon={<FaFacebookF size={20} color="blue" />}
                    title="Facebook"
                    description={s ? (s.providers.facebook ? t("connected") : t("notConnected")) : "…"}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.providers.facebook)}
                            onChange={() => toggleProvider("facebook")}
                        />
                    }
                />

                <SettingRow icon={<FaApple size={22} />}
                    title="Apple"
                    description={s ? (s.providers.apple ? t("connected") : t("notConnected")) : "…"}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.providers.apple)}
                            onChange={() => toggleProvider("apple")}
                        />
                    }
                />

                <SettingRow icon={<MessageSquareText />}
                    title={t("community")}
                    link="/profile/community"
                />
            </SettingsSection>

            <SettingsSection title={t("preferences")} icon={<SlidersHorizontal size={20} className="text-red-500" />}>
                <SettingRow
                    title={t("darkMode")}
                    description={t("darkModeText")}
                    action={<ToggleSwitch enabled={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />}
                />

                <SettingRow
                    title={t("language")}
                    description={t("languageText")}
                    action={
                        <div className="z-999">
                            <LanguageChange />
                        </div>}
                />

                <SettingRow
                    title={t("notifications")}
                    description={t("notificationsText")}
                    action={<button type="button" onClick={() => setDialog("notifications")} disabled={!s} className={actionClass}>{t("configure")}</button>}
                />
                <AutoRenewRow />
            </SettingsSection>

            <SettingsSection title={t("help")} icon={<FaInfoCircle size={20} className="text-red-500" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6">
                    <SettingRow icon={<FaFile />}
                        link="/terms-of-service"
                        title={t("terms")}
                    />

                    <SettingRow icon={<FaUserShield />}
                        title={t("privacy")}
                        link="/privacy-policy"
                    />

                    <SettingRow icon={<FiLifeBuoy />}
                        title={t("helpCenter")}
                        link="/profile/live-chat"

                    />

                    <SettingRow icon={<FaQuestionCircle />}
                        title={t("about")}
                        link="/about"
                    />


                </div>
            </SettingsSection>
            <div>
                <p className="text-center text-gray-500 dark:text-neutral-400">© 2026 FANG . All rights reserved.</p>
                <p className="text-center text-gray-500 dark:text-neutral-400">Powered by FANGVAULT</p>
            </div>


            {/* POPUPS */}
            <EditProfileCard open={dialog === "profile"} onClose={() => { setDialog(null); load(); }} />
            {s && (
                <>
                    <ChangePasswordDialog open={dialog === "password"} onClose={() => setDialog(null)} hasPassword={s.hasPassword} onDone={load} />
                    <ChangeEmailDialog open={dialog === "email"} onClose={() => setDialog(null)} hasPassword={s.hasPassword}
                        onDone={() => { load(); fetchUser(); }} />
                    <TwoFactorDialog open={dialog === "twoFactor"} onClose={() => setDialog(null)} enable={twoFactorTarget}
                        onDone={(enabled) => setSettings((prev) => (prev ? { ...prev, twoFactor: enabled } : prev))} />
                    <DeleteAccountDialog open={dialog === "delete"} onClose={() => setDialog(null)} hasPassword={s.hasPassword}
                        isWriter={s.isWriter} onDone={afterDelete} />
                    <NotificationsDialog open={dialog === "notifications"} onClose={() => setDialog(null)} value={s.notifications}
                        onDone={(n) => setSettings((prev) => (prev ? { ...prev, notifications: n } : prev))} />
                </>
            )}
        </div>
    );
}



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
import { SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";
import { FaFacebookF, FaFile, FaShieldHalved, FaUserPen, FaUserShield } from "react-icons/fa6";
import { FiLifeBuoy, FiLink } from "react-icons/fi";
import { FaInfoCircle, FaQuestionCircle } from "react-icons/fa";

type Provider = "google" | "facebook";

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

const PROVIDER_NAMES: Record<Provider, string> = { google: "Google", facebook: "Facebook" };

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—";

// "Changed 3 months ago"
function changedAgo(iso: string | null) {
    if (!iso) return "Set";
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return `Changed ${rtf.format(Math.round(seconds / size), unit)}`;
    }
    return "Changed just now";
}

const actionClass = "text-red-500 font-medium cursor-pointer";

export default function SettingsPage() {
    const router = useRouter();
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
        if (!url.searchParams.get("auth_error") && PROVIDER_NAMES[linked]) toast.success(`${PROVIDER_NAMES[linked]} connected`);
        url.searchParams.delete("linked");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, []);

    // Connect: the provider's sign-in page, in "link" mode, then back here
    const connect = (provider: Provider) => {
        const next = `${pathname}?linked=${provider}`;
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
                toast.error(data.message || "Couldn't disconnect");
                return;
            }
            toast.success(`${PROVIDER_NAMES[provider]} disconnected`);
            await load();
        } catch {
            toast.error("Unable to reach the server. Please try again.");
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
            toast.info("Set a password first: two-factor protects password sign-in.");
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
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-500 dark:text-neutral-400">Manage your account, preferences and connected services.</p>
            </div>

            <SettingsSection title="Account Information" icon={<FaUserPen size={20} color="red" />}>
                <SettingRow
                    title="Username"
                    description={s ? (s.username ? `@${s.username}` : "Not set") : "…"}
                    action={<button type="button" onClick={() => setDialog("profile")} className={actionClass}>Edit</button>}
                />

                <SettingRow
                    title="Email"
                    description={s?.email ?? user?.email ?? "…"}
                    action={<button type="button" onClick={() => setDialog("email")} disabled={!s} className={actionClass}>Edit</button>}
                />

                <SettingRow
                    title="Joined Date"
                    description={s ? formatDate(s.joinedAt) : "…"}
                    action={<span className="text-gray-400 text-sm">Read only</span>}
                />
            </SettingsSection>

            <SettingsSection title="Secure & Login" icon={<FaShieldHalved color="red" size={20} />}>
                <SettingRow
                    title="Password"
                    description={s ? (s.hasPassword ? changedAgo(s.passwordChangedAt) : "Not set: you sign in with Google or Facebook") : "…"}
                    action={
                        <button type="button" onClick={() => setDialog("password")} disabled={!s} className={actionClass}>
                            {s && !s.hasPassword ? "Set" : "Change"}
                        </button>
                    }
                />

                <SettingRow
                    title="Two-Factor Authentication"
                    description="Email a code when you sign in with your password"
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.twoFactor)}
                            onChange={openTwoFactor}
                        />
                    }
                />

                <SettingRow
                    title="Delete Account"
                    description="Permanently remove your account and data"
                    action={
                        <button type="button" onClick={() => setDialog("delete")} disabled={!s} className="border border-red-500 text-red-500 px-4 py-1 rounded-full">
                            Delete
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Social Accounts" icon={<FiLink size={20} color="red" />}>
                <SettingRow
                    title="Google" icon={<Image src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" width={20} height={20} unoptimized className="w-5" />}
                    description={s ? (s.providers.google ? "Connected" : "Not Connected") : "…"}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.providers.google)}
                            onChange={() => toggleProvider("google")}
                        />
                    }
                />

                <SettingRow icon={<FaFacebookF size={20} color="blue" />}
                    title="Facebook"
                    description={s ? (s.providers.facebook ? "Connected" : "Not Connected") : "…"}
                    action={
                        <ToggleSwitch
                            enabled={Boolean(s?.providers.facebook)}
                            onChange={() => toggleProvider("facebook")}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="Preferences" icon={<SlidersHorizontal size={20} className="text-red-500" />}>
                <SettingRow
                    title="Dark Mode"
                    description="Lower Light Reading Experience"
                    action={<ToggleSwitch enabled={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />}
                />

                <SettingRow
                    title="Language"
                    description="App + Reading Language"
                    action={
                        <div className="z-999">
                            <LanguageChange />
                        </div>}
                />

                <SettingRow
                    title="Notification Preferences"
                    description="Choose what alert you should receive"
                    action={<button type="button" onClick={() => setDialog("notifications")} disabled={!s} className={actionClass}>configure</button>}
                />
            </SettingsSection>

            <SettingsSection title="Help & Info" icon={<FaInfoCircle size={20} className="text-red-500" />}>
                <div className="grid grid-cols-2">
                    <SettingRow icon={<FaFile />}
                        link="/terms-of-service"
                        title="Terms of Service"
                    />

                    <SettingRow icon={<FaUserShield />}
                        title="Privacy Policy"
                        link="/privacy-policy"
                    />

                    <SettingRow icon={<FiLifeBuoy />}
                        title="Help Center"
                        link="/profile/live-chat"

                    />

                    <SettingRow icon={<FaQuestionCircle />}
                        title="About Fang"
                        link="/about"
                    />
                </div>
            </SettingsSection>
            <p className="text-center text-gray-500 dark:text-neutral-400">FANG v2.4.1 · © 2026 FANG Reading Co.</p>

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
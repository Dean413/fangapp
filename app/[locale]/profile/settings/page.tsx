"use client";

import SettingRow from "@/components/profile-components/settings/settings-row";
import SettingsSection from "@/components/profile-components/settings/settings-section";
import ToggleSwitch from "@/components/profile-components/settings/toggle-switch";
import { useAuthStore } from "@/lib/store/authStore";
import LanguageChange from "@/components/language-change";
import { Headset, LifeBuoy, Link2, Palette, Shield, ShieldCheck, Sliders, SlidersHorizontal, UserPen } from "lucide-react";
import Image from "next/image";
import { ShieldCheckered, ShieldChevron } from "phosphor-react";
import { useState } from "react";
import { FaFacebookF, FaFile, FaFileContract, FaShieldHalved, FaUserPen, FaUserShield, FaXTwitter } from "react-icons/fa6";
import { FiEdit, FiEdit2, FiLifeBuoy, FiLink, FiLink2, FiSettings, FiShield, FiSidebar } from "react-icons/fi";
import { FaInfoCircle, FaQuestionCircle } from "react-icons/fa";


export default function SettingsPage() {
    const [twoFA, setTwoFA] = useState(true);
    const [google, setGoogle] = useState(true);
    const [apple, setApple] = useState(true);
    const [x, setX] = useState(true)
    const [faceBook, setFaceBook] = useState(false)
    const { user } = useAuthStore()

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-500 dark:text-neutral-400">Manage your account, preferences and connected services.</p>
            </div>

            <SettingsSection title="Account Information" icon={<FaUserPen size={20} color="red" />}>
                <SettingRow
                    title="Username"
                    description={user?.full_name}
                    action={<button>Edit</button>}
                />

                <SettingRow
                    title="Email"
                    description={user?.email}
                    action={<button>Edit</button>}
                />

                <SettingRow
                    title="Joined Date"
                    description="March 14, 2023"
                    action={<span>Read only</span>}
                />
            </SettingsSection>

            <SettingsSection title="Secure & Login" icon={<FaShieldHalved color="red" size={20} />}>
                <SettingRow
                    title="Password"
                    description="Changed 3 months ago"
                    action={<button>Change</button>}
                />

                <SettingRow
                    title="Two-Factor Authentication"
                    description="Extra layer of security"
                    action={
                        <ToggleSwitch
                            enabled={twoFA}
                            onChange={() => setTwoFA(!twoFA)}
                        />
                    }
                />

                <SettingRow
                    title="Delete Account"
                    description="Permanently remove your account and data"
                    action={
                        <button className="border border-red-500 text-red-500 px-4 py-1 rounded-full">
                            Delete
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Social Accounts" icon={<FiLink size={20} color="red" />}>
                <SettingRow
                    title="Google" icon={<Image src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" width={20} height={20} className="w-5" />}
                    description="Connected"
                    action={
                        <ToggleSwitch
                            enabled={google}
                            onChange={() => setGoogle(!google)}
                        />
                    }
                />

                <SettingRow icon={<FaFacebookF size={20} color="blue" />}
                    title="Facebook"
                    description="Not Connected"
                    action={
                        <ToggleSwitch
                            enabled={faceBook}
                            onChange={() => setApple(!faceBook)}
                        />
                    }
                />


                <SettingRow icon={<Image src="https://www.svgrepo.com/show/503173/apple-logo.svg" alt="Google" width={20} height={20} />}
                    title="Apple"
                    description="Connected"
                    action={
                        <ToggleSwitch
                            enabled={apple}
                            onChange={() => setApple(!apple)}
                        />
                    }
                />

                <SettingRow icon={<FaXTwitter size={20} />}
                    title="X"
                    description="Connected"
                    action={
                        <ToggleSwitch
                            enabled={x}
                            onChange={() => setApple(!x)}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="Preferences" icon={<SlidersHorizontal size={20} className="text-red-500" />}>
                <SettingRow
                    title="Dark Mode"
                    description="Lower Light Reading Experience"
                    action={<ToggleSwitch enabled={x} onChange={() => setApple(!x)} />}
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
                    action={<p className="text-red-500">configure</p>}
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
        </div>
    );
}
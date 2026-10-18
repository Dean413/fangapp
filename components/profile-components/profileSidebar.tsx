"use client";

import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import Swal from "sweetalert2"
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FiUser, FiBell, FiSettings, FiUsers, FiCreditCard, FiStar, FiClipboard, FiMessageCircle } from "react-icons/fi";
import { ClipboardEdit, LucideMessageSquareText, MessageCircle } from "lucide-react";
import UnreadBadge from "@/components/unreadBadge";

const NOTIFICATIONS_PATH = "/profile/notifications";

const links = [
    {
        name: "Profile",
        href: "/profile",
        icon: FiUser,
    },
    {
        name: "Wallet",
        href: "/profile/wallet",
        icon: FiCreditCard,
    },

    {
        name: "Transaction History",
        href: "/profile/transaction-history",
        icon: ClipboardEdit,
    },

    {
        name: "Community",
        href: "/profile/community",
        icon: FiUsers,
    },
    {
        name: "Notifications",
        href: NOTIFICATIONS_PATH,
        icon: FiBell,
    },
    {
        name: "Reviews",
        href: "/profile/reviews",
        icon: FiStar,
    },
    {
        name: "Settings",
        href: "/profile/settings",
        icon: FiSettings,
    },

    {
        name: "Live chat",
        href: "/profile/live-chat",
        icon: LucideMessageSquareText,
    },
];

export default function ProfileSidebar() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const router = useRouter();
    const { logout } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const logOut = async () => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "You will be logged out of your account",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, logout",
        });

        if (!result.isConfirmed) return;

        try {
            setLoading(true);
            await logout();
            await Swal.fire({
                title: "Logged out",
                text: "You have been successfully logged out",
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
            });

        } finally {
            setLoading(false);
        }
    };


    return (
        <nav className="flex flex-col gap-2">
            {links.map((link) => {
                const Icon = link.icon;
                return (

                    <Link key={link.href} href={link.href} className={`relative flex items-center gap-3 rounded-lg px-4 py-3 ml-15 transition-all
                        ${isActive(link.href) ? "bg-red-50 text-red-600 dark:bg-red-950/40" : "text-black dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card"}`}>
                        {isActive(link.href) && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-red-600" />
                        )}
                        <Icon size={18} className={`${isActive(link.href) ? "red" : "black"}`} />
                        <span className="">
                            {link.name}
                        </span>
                        {link.href === NOTIFICATIONS_PATH && <UnreadBadge className="ml-auto" />}
                    </Link>

                );
            })}
            <div className="border-t flex justify-center border-gray-100 dark:border-dark-border">
                <button onClick={logOut} disabled={loading} className="text-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 mt-4 rounded-md px-4 py-3">
                    Log out
                </button>
            </div>
        </nav>
    );
}
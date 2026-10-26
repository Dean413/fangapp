"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiUser, FiCreditCard, FiUsers, FiBell, FiStar, FiSettings, FiHome, } from "react-icons/fi";
import { useTranslations } from "next-intl";

const links = [
    { name: "Home" as const, href: "/", icon: FiHome },
    { name: "Genres" as const, href: "/profile/wallet", icon: FiCreditCard },
    { name: "Writer Areana" as const, href: "/profile/community", icon: FiUsers },
    // { name: "Transaction History", href: "/profile/transaction-history", icon: FiUsers },
    // { name: "" as const, href: "/profile/notifications", icon: FiBell },
    // { name: "Reviews" as const, href: "/profile/reviews", icon: FiStar },

];

export default function MobileProfileNav() {
    const pathname = usePathname();
    const t = useTranslations("ProfileNav");

    return (
        <nav className="bg-white dark:bg-dark-card border-t shadow-lg flex justify-between px-4 py-2">

            {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center text-xs"
                    >
                        <Icon
                            size={20}
                            className={active ? "text-red-600" : "text-gray-500 dark:text-neutral-400"}
                        />
                        <span className={active ? "text-red-600" : "text-gray-500 dark:text-neutral-400"}>
                            {t(link.name)}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
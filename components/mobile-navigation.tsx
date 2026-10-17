"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiUser, FiCreditCard, FiUsers, FiBell, FiStar, FiSettings, } from "react-icons/fi";

const links = [
    { name: "Profile", href: "/profile", icon: FiUser },
    { name: "Wallet", href: "/profile/wallet", icon: FiCreditCard },
    { name: "Community", href: "/profile/community", icon: FiUsers },
    // { name: "Transaction History", href: "/profile/transaction-history", icon: FiUsers },
    { name: "Notifications", href: "/profile/notifications", icon: FiBell },
    { name: "Reviews", href: "/profile/reviews", icon: FiStar },

];

export default function MobileProfileNav() {
    const pathname = usePathname();

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
                            {link.name}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
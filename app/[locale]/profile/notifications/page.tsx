"use client";
import { useState } from "react";
import { BookOpen, Coins, Crown, Lock, LucideUnlockKeyhole, UnlockIcon, UserPlus } from "lucide-react";
import NotificationTabs from "@/components/profile-components/notification/notification-tabs";
import NotificationCard from "@/components/profile-components/notification/notification-cards";
import NotificationSection from "@/components/profile-components/notification/notification-section";
import { FaBookOpen, FaCrown, FaTableCellsColumnLock, FaUnlock, FaUnlockKeyhole } from "react-icons/fa6";
import Image from "next/image";
import { FaUnlockAlt } from "react-icons/fa";
import { FiUnlock } from "react-icons/fi";



export default function NotificationsPage() {
    const [active, setActive] = useState("Unread");

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="md:flex justify-between items-center mb-8">
                <h1 className="text-xl md:text-3xl font-bold">Notifications</h1>
                <NotificationTabs
                    active={active}
                    setActive={setActive}
                />
            </div>

            <NotificationSection title="Today">
                <NotificationCard
                    highlighted
                    icon={
                        <div className="bg-red-500 p-3 rounded-xl text-white">
                            <FaBookOpen size={20} />
                        </div>
                    }
                    title={
                        <>
                            <strong>R. J. Hart</strong> updated
                            <strong> The Crimson Throne</strong>
                        </>
                    }
                    subtitle="2 mins ago • Chapter 47"
                    action={
                        <button className="bg-red-500 text-white px-5 py-2 rounded-full">
                            Read
                        </button>
                    }
                />

                <NotificationCard
                    icon={
                        <div className="bg-yellow-100 dark:bg-yellow-500/15 p-3 rounded-xl">
                            <Image src="/fang_pictures/balance.png" alt="coins" width={20} height={20} />
                        </div>
                    }
                    title={
                        <>
                            You received <strong>50 coins</strong>
                        </>
                    }
                    subtitle="1 hour ago"
                />

                <NotificationCard
                    icon={
                        <div className="bg-green-100 dark:bg-green-500/15 p-3 rounded-xl">
                            <Image src="/fang_pictures/balance.png" alt="coins" width={20} height={20} />
                        </div>
                    }
                    title={
                        <>
                            <strong>500 Coins Purchased</strong>
                        </>
                    }
                    subtitle="TXN #FNG-8829145"
                    action={
                        <span className="font-semibold text-green-600"> +500 🪙</span>
                    }
                />
            </NotificationSection>

            <div className="mt-10">
                <NotificationSection title="Yesterday">
                    <NotificationCard
                        icon={
                            <div className="bg-red-100 dark:bg-red-500/15 p-3 rounded-xl">
                                <FaCrown size={20} color="red" />
                            </div>
                        }
                        title="VIP Monthly Subscription"
                        subtitle="Yesterday"
                        action={
                            <div className="flex gap-3">
                                <p className="text-red-500 font-semibold"> -300 </p>
                                <Image src="/fang_pictures/balance.png" alt="coins" width={20} height={10} />
                            </div>
                        }
                    />

                    <NotificationCard
                        icon={
                            <div className="bg-indigo-100 dark:bg-indigo-500/15 p-3 rounded-xl">
                                <FaUnlockAlt size={20} color="purple" />
                            </div>
                        }
                        title='Unlock Chapter "Veil of Embers" Ch.12'
                        subtitle="Yesterday"
                        action={
                            <div className="flex gap-3">
                                <p className="text-red-500 font-semibold"> -25 </p>
                                <Image src="/fang_pictures/balance.png" alt="coins" width={20} height={10} />
                            </div>

                        }
                    />

                    <NotificationCard
                        icon={
                            <div className="bg-gray-100 dark:bg-dark-raised p-3 rounded-xl">
                                <UserPlus />
                            </div>
                        }
                        title={
                            <>
                                <strong>Aria Knight</strong> followed you
                            </>
                        }
                        subtitle="Yesterday"
                        action={
                            <button className="border border-red-500 text-red-500 px-4 py-2 rounded-full">
                                Follow Back
                            </button>
                        }
                    />
                </NotificationSection>
            </div>
        </div>
    );
}
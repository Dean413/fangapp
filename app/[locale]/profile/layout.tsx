"use client"

import { Button } from "@/components/Button";
import MobileProfileNav from "@/components/mobile-navigation";
import ProfileSidebar from "@/components/profile-components/profileSidebar";
import { useAuthStore } from "@/lib/store/authStore";
import { useAuthModals } from "@/lib/store/auth-card-store";

export default function ProfileLayout({ children, }: { children: React.ReactNode; }) {
    const { openSignUp } = useAuthModals()
    const user = useAuthStore((s) => s.user)
    const loading = useAuthStore((s) => s.loading)

    // Still checking the login: show nothing yet, so signed-in readers don't see the sign-up screen flash
    if (loading && !user) {
        return <div className="w-full min-h-screen bg-gray-50 dark:bg-dark" />;
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>
                    <h1 className="font-bold text-2xl text-center mb-4">Create an Account  to Join thousands of readers on FANG</h1>
                    <Button onClick={openSignUp} label="SIGN UP" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-50 dark:bg-dark pb-20 md:pb-6">
            <div className="flex gap-6">
                {/* Sidebar */}
                <aside className="hidden md:block w-64 shrink-0 border-r border-gray-100 dark:border-dark-border">

                    <div className="fixed h-screen flex flex-col bg-white dark:bg-black pt-4 pr-4">

                        {/* Top content */}
                        <div className="flex-1 overflow-y-auto">
                            <ProfileSidebar />
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 w-full">
                    {children}
                </main>
            </div>

            {/* Mobile nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                <MobileProfileNav />
            </div>
        </div>
    );
}
import { ReactNode } from "react";

interface Props {
    icon: ReactNode;
    title: ReactNode;
    subtitle?: string;
    action?: ReactNode;
    highlighted?: boolean;
}

export default function NotificationCard({ icon, title, subtitle, action, highlighted }: Props) {
    return (
        <div className={`rounded-2xl border p-4 flex items-center justify-between
            ${highlighted ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border"}`}>
            <div className="flex items-center gap-4">
                {icon}
                <div>
                    <h4 className="font-medium"> {title}</h4>

                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action}
        </div>
    );
}
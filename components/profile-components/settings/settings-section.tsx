interface Props {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export default function SettingsSection({ title, icon, children }: Props) {
    return (
        <div className="bg-white dark:bg-dark-card border border-gray-400 dark:border-neutral-600 rounded-2xl p-6">
            <h3 className="font-semibold mb-5 flex items-center gap-2">
                {icon && <span>{icon}</span>}
                {title}
            </h3>

            {children}
        </div>
    );
}
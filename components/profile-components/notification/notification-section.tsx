interface Props {
    title: string;
    children: React.ReactNode;
}

export default function NotificationSection({
    title,
    children
}: Props) {
    return (
        <div>
            <p className="uppercase text-xs tracking-widest text-gray-400 dark:text-neutral-500 mb-4">
                {title}
            </p>

            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}
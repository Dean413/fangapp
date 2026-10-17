import Link from "next/link";
import { useRouter } from "next/navigation";


interface Props {
    title: string;
    icon?: React.ReactNode;
    description?: string;
    link?: string;
    action?: React.ReactNode;
}

export default function SettingRow({ title, link, description, icon, action }: Props) {
    const router = useRouter()
    return (
        <div className="flex justify-between items-center py-4 border-b border-b-gray-300 last:border-none">
            <div>
                <button onClick={() => link && router.push(link)} className={`font-semibold ${link ? "cursor-pointer" : ""} flex items-center gap-2 ${title === "Delete Account" ? "text-red-500" : ""}`}>
                    {icon && <span>{icon}</span>}
                    {title}
                </button>




                {description && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                        {description}
                    </p>
                )}
            </div>

            {action}
        </div>
    );
}
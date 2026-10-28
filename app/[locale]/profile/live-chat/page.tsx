// // app/page.js (or pages/index.js)

// import Image from "next/image";
// import { useTranslations } from "next-intl";

// // Labels: LiveChat.topic_<key>
// const topics = [
//     { icon: "👤", key: "account" },
//     { icon: "💳", key: "payment" },
//     { icon: "💰", key: "coins" },
//     { icon: "📖", key: "reading" },
//     { icon: "❌", key: "technical" },
//     { icon: "❓", key: "other" },
// ];

// export default function FangBot() {
//     const t = useTranslations("LiveChat");
//     return (
//         <div className="flex flex-col bg-white dark:bg-dark-card border rounded-lg border-gray-300 dark:border-neutral-700 mx-3 md:mx-auto md:max-w-[75%] my-6">
//             {/* Main Chat Area */}
//             <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
//                 {/* Bot Avatar Placeholder */}
//                 <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-4">
//                     <Image src="/fang_pictures/fang-bot.png" alt="fang bot" width={100} height={100} />
//                 </div>

//                 {/* Greeting */}
//                 <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">
//                     {t("greeting")}
//                 </h1>
//                 <p className="text-gray-500 dark:text-neutral-400 text-sm sm:text-base text-center mb-8">
//                     {t.rich("intro", { br: () => <br className="hidden sm:block" /> })}
//                 </p>

//                 {/* Topic Buttons */}
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full sm:w-[80%]">
//                     {topics.map((topic) => (
//                         <button key={topic.key}
//                             className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-neutral-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-300 dark:hover:border-pink-500/40 transition-colors">
//                             <span>{topic.icon}</span>
//                             <span className="text-left leading-tight">{t(`topic_${topic.key}`)}</span>
//                         </button>
//                     ))}
//                 </div>
//             </div>

//             {/* Input Bar */}
//             <div className="border-t border-gray-300 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
//                 <input
//                     type="text"
//                     placeholder={t("placeholder")}
//                     className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-red-300"
//                 />
//                 <button className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
//                         <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
//                     </svg>
//                 </button>
//             </div>

//         </div>
//     );
// }

// app/page.js (or pages/index.js)

import Image from "next/image";
import { useTranslations } from "next-intl";

// Labels: LiveChat.topic_<key>
const topics = [
    { icon: "👤", key: "account" },
    { icon: "💳", key: "payment" },
    { icon: "💰", key: "coins" },
    { icon: "📖", key: "reading" },
    { icon: "❌", key: "technical" },
    { icon: "❓", key: "other" },
];

export default function FangBot() {
    const t = useTranslations("LiveChat");
    return (
        <div className="flex flex-col bg-white dark:bg-dark-card border rounded-lg border-gray-300 dark:border-neutral-700 mx-3 md:mx-auto md:max-w-[75%] my-6">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Bot Avatar Placeholder */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-4">
                    <Image src="/fang_pictures/fang-bot.png" alt="fang bot" width={100} height={100} />
                </div>

                {/* Greeting */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">
                    {t("greeting")}
                </h1>
                <p className="text-gray-500 dark:text-neutral-400 text-sm sm:text-base text-center mb-8">
                    {t.rich("intro", { br: () => <br className="hidden sm:block" /> })}
                </p>

                {/* Topic Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full sm:w-[80%]">
                    {topics.map((topic) => (
                        <button key={topic.key}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-neutral-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-300 dark:hover:border-pink-500/40 transition-colors">
                            <span>{topic.icon}</span>
                            <span className="text-left leading-tight">{t(`topic_${topic.key}`)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-gray-300 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
                <input
                    type="text"
                    placeholder={t("placeholder")}
                    className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-red-300"
                />
                <button className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                    </svg>
                </button>
            </div>

        </div>
    );
}
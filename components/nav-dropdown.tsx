import { Link, usePathname } from "@/i18n/routing";
import { useDropDownStore } from "@/lib/store/dropDownStore";
import { useEffect, useState } from "react";

const NavBarDropDown = ({ onClick }: { onClick?: () => void }) => {
    const [activeCategory, setActiveCategory] = useState<"novels" | "shorties">("novels");
    const { isDropDownOpen, closeDropDown } = useDropDownStore();
    const pathName = usePathname();

    const closeNav = () => {
        closeDropDown();
        onClick?.();
    };

    const novelGenres = [
        { name: "Dark Romance", isNew: true },
        { name: "Werewolves", isNew: false },
        { name: "Urban", isNew: false },
        { name: "Mafia", isNew: false },
        { name: "Erotic", isNew: false },
        { name: "Billionaire", isNew: false },
        { name: "Reverse Harem", isNew: false },
        { name: "Supernatural", isNew: false },
        { name: "Vampire", isNew: false },
        { name: "Fantasy", isNew: true },
        { name: "Urban", isNew: false },
        { name: "Paranormal", isNew: true },
    ];


    const shortieGenres = [
        { name: "Flash Fiction", isNew: true },
        { name: "Micro Horror", isNew: false },
        { name: "Prose Poetry", isNew: false },
        { name: "Slice of Life", isNew: false },
        { name: "Comedy", isNew: false },
        { name: "Drama", isNew: true },
        { name: "Romance", isNew: false },
        { name: "Suspense", isNew: false },
        { name: "Fantasy", isNew: false },
        { name: "Sci-Fi", isNew: false },
        { name: "Other", isNew: false },
    ];

    const slugify = (text: any) => text.toLowerCase().replace(/&/g, "and").replace(/\+/g, "").replace(/\//g, "-").replace(/\s+/g, "-").trim();
    const genres = activeCategory === "novels" ? novelGenres : shortieGenres;
    const baseRoute = activeCategory === "novels" ? "/novels" : "/shorties";

    return (
        <div className="flex flex-col w-full md:w-170 dark:bg-dark-card bg-white mt-7 border border-gray-200 dark:border-dark-border shadow-lg">
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex dark:bg-dark justify-center md:justify-start flex-row md:flex-col gap-1 mx-0 md:min-w-37 relative bg-gray-50 pt-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-dark-border">
                    <button onClick={() => setActiveCategory("novels")} className={`relative text-left  text-sm font-medium px-3 py-2 transition-colors
                        ${activeCategory === "novels" ? "bg-red-100 dark:bg-red-500/15 text-red-500" : "hover:bg-gray-100 dark:hover:bg-dark-raised text-gray-700 dark:text-neutral-200"}`}>
                        {activeCategory === "novels" && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-9 bg-red-500 hidden md:block" />
                        )}
                        <span>Novels</span>
                    </button>

                    <button onClick={() => setActiveCategory("shorties")} className={`relative text-left text-sm font-medium px-3 py-2 transition-colors
                        ${activeCategory === "shorties" ? "bg-red-100 dark:bg-red-500/15 text-red-500" : "hover:bg-gray-100 dark:hover:bg-dark-raised text-gray-700 dark:text-neutral-200"}`}>
                        {activeCategory === "shorties" && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-9 bg-red-500 hidden md:block" />
                        )}
                        <span>Shorties</span>
                    </button>
                </div>

                <div className="flex-1 flex flex-col pt-4 md:pt-6">
                    <p className="text-xs font-medium text-gray-400 dark:text-neutral-500 px-4">{activeCategory === "novels" ? "Novels" : "Shorties"} · Genres</p>
                    <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-8 py-4 md:py-8">
                        {genres.map((genre, key) => {
                            const slug = slugify(genre.name);
                            const href = `${baseRoute}/${slug}`;
                            return (
                                <Link onClick={closeNav} key={key} href={href}
                                    className={`relative text-xs px-2 py-1 cursor-pointer transition-colors ${genre.isNew ? "font-semibold text-gray-700 dark:text-neutral-200" : "text-gray-500 dark:text-neutral-400"} hover:bg-gray-100 dark:hover:bg-dark-raised hover:text-gray-800 dark:hover:text-neutral-100`}>
                                    {genre.isNew && (
                                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    )}
                                    {genre.name}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between px-4 md:px-8 border-t border-gray-100 dark:border-dark-border py-4 md:py-8">
                        <p className="text-xs md:text-sm text-gray-600 dark:text-neutral-300">Click a Genre to explore stories</p>
                        <Link href={activeCategory === "novels" ? "/novels" : "/shorties"} onClick={closeNav} className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 px-3 py-1 rounded-full hover:bg-red-100 dark:hover:bg-red-500/15 transition">
                            Browse all
                            <span className="text-red-500">→</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NavBarDropDown;
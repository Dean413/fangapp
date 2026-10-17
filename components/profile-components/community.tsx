"use client";
import { useState } from "react";
import { Heart, MessageCircle, Share2, Image, Gift, BarChart2, FileText, Video, MoreHorizontal, Globe, Flame } from "lucide-react";

const trendingTopics = [
    { tag: "#BookTok", posts: "24.5k posts" },
    { tag: "#FantasyReads", posts: "18.2k posts" },
    { tag: "#RomanceNovels", posts: "12.7k posts" },
    { tag: "#MysteryBooks", posts: "9.1k posts" },
    { tag: "#IndieAuthors", posts: "6.4k posts" },
];

const popularMembers = [
    { name: "Aria Knight", followers: "24,300 followers", initials: "AK", color: "bg-rose-400" },
    { name: "Marcus Vale", followers: "16,900 followers", initials: "MV", color: "bg-violet-400" },
    { name: "Sasha Lin", followers: "13,200 followers", initials: "SL", color: "bg-sky-400" },
    { name: "Theo Brand", followers: "9,800 followers", initials: "TB", color: "bg-amber-400" },
];

const onlineColors = [
    "bg-rose-300", "bg-violet-300", "bg-sky-300", "bg-emerald-300",
    "bg-amber-300", "bg-pink-300", "bg-indigo-300", "bg-teal-300",
    "bg-orange-300", "bg-purple-300",
];

export default function CommunityComponent() {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(1284);

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount((c) => (liked ? c - 1 : c + 1));
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-dark font-sans">


            <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Feed */}
                <div className="lg:col-span-2 flex flex-col gap-4">

                    {/* Create Post */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <input type="text" className="flex-1 bg-gray-100 dark:bg-dark-raised rounded-full px-4 py-2 text-sm text-gray-600 dark:text-neutral-300 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-rose-300"
                                placeholder="What's on your mind, Faith?"
                            />
                        </div>
                        <div className="md:flex space-y-2 items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border">
                            <div className="flex items-center gap-1">
                                {[
                                    { icon: <Image className="w-4 h-4 text-green-500" />, label: "Image" },
                                    { icon: <Gift className="w-4 h-4 text-rose-400" />, label: "GIF" },
                                    { icon: <BarChart2 className="w-4 h-4 text-blue-500" />, label: "Poll" },
                                    // { icon: <FileText className="w-4 h-4 text-orange-400" />, label: "Article" },
                                    { icon: <Video className="w-4 h-4 text-red-500" />, label: "Video" },
                                ].map(({ icon, label }) => (
                                    <button key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised px-2 py-1.5 rounded-lg transition-colors">
                                        {icon} {label}
                                    </button>
                                ))}
                            </div>
                            <button className="bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-5 py-1.5 rounded-full transition-colors">
                                Create Post
                            </button>
                        </div>
                    </div>

                    {/* Luna West Post */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                        <div className="flex items-start justify-between px-4 pt-4 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white text-sm font-bold shrink-0">LW</div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Fangverse</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500">
                                        <span>2 hours ago</span>
                                        <span>·</span>
                                        <Globe className="w-3 h-3" />
                                        <span>Public</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 pb-3">
                            <p className="text-gray-800 dark:text-neutral-100 text-sm leading-relaxed">
                                Just finished re-reading &quot;The Crimson Throne&quot; and I&apos;m <em>still</em> not over that ending. The world-building is unmatched. 🕯️🔥
                            </p>
                            <div className="flex gap-2 mt-2">
                                {["#BookTok", "#Fantasy", "#MustRead"].map((tag) => (
                                    <span key={tag} className="text-rose-500 text-sm font-medium hover:underline cursor-pointer">{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* Atmospheric book cover illustration */}
                        <div className="relative w-full h-72 bg-gray-950 overflow-hidden">
                            {/* Candlelight glow */}
                            <div className="absolute top-8 left-1/3 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
                            <div className="absolute top-6 right-1/3 w-16 h-16 bg-amber-400/15 rounded-full blur-xl" />
                            {/* Column pillars */}
                            <div className="absolute left-8 top-0 bottom-0 w-6 bg-linear-to-r from-gray-700 to-gray-800 rounded" />
                            <div className="absolute right-8 top-0 bottom-0 w-6 bg-linear-to-l from-gray-700 to-gray-800 rounded" />
                            {/* Candles */}
                            <div className="absolute top-10 left-16 flex flex-col items-center gap-0">
                                <div className="w-1.5 h-3 bg-amber-200 rounded-full blur-sm opacity-90" />
                                <div className="w-2 h-10 bg-amber-100/80 rounded" />
                            </div>
                            <div className="absolute top-14 right-16 flex flex-col items-center">
                                <div className="w-1.5 h-3 bg-amber-200 rounded-full blur-sm opacity-70" />
                                <div className="w-2 h-8 bg-amber-100/60 rounded" />
                            </div>
                            {/* Two figures */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-3">
                                {/* Woman */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-gray-600 rounded-full" />
                                    <div className="w-14 h-32 bg-linear-to-b from-gray-700 to-gray-900 rounded-t-2xl" />
                                </div>
                                {/* Man */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                                    <div className="w-16 h-36 bg-linear-to-b from-slate-800 to-slate-950 rounded-t-2xl" />
                                </div>
                            </div>
                            {/* Title text */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
                                <p className="text-amber-200/50 text-[10px] tracking-[0.3em] uppercase font-light whitespace-nowrap">The Crimson Throne</p>
                            </div>
                        </div>

                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-dark-border">
                            <div className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px]">♥</span>
                                <span>{likeCount.toLocaleString()} Likes</span>
                            </div>
                            <div className="flex gap-3">
                                <span>312 Comments</span>
                                <span>84 Shares</span>
                            </div>
                        </div>

                        <div className="px-2 py-1 flex items-center justify-around">
                            <button onClick={handleLike}
                                className={`flx items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${liked ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" : "text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised"
                                    }`}>
                                <Heart className={`w-4 h-4  ${liked ? "fill-rose-500 text-rose-500" : ""}`} />

                            </button>
                            <button className="flx items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised transition-colors">
                                <MessageCircle className="w-4 h-4" />

                            </button>
                            <button className="fex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised transition-colors">
                                <Share2 className="w-4 h-4" />

                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                        <div className="flex items-start justify-between px-4 pt-4 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white text-sm font-bold shrink-0">LW</div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Luna West</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500">
                                        <span>2 hours ago</span>
                                        <span>·</span>
                                        <Globe className="w-3 h-3" />
                                        <span>Public</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-raised">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 pb-3">
                            <p className="text-gray-800 dark:text-neutral-100 text-sm leading-relaxed">
                                Just finished re-reading &quot;The Crimson Throne&quot; and I&apos;m <em>still</em> not over that ending. The world-building is unmatched. 🕯️🔥
                            </p>
                            <div className="flex gap-2 mt-2">
                                {["#BookTok", "#Fantasy", "#MustRead"].map((tag) => (
                                    <span key={tag} className="text-rose-500 text-sm font-medium hover:underline cursor-pointer">{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* Atmospheric book cover illustration */}
                        <div className="relative w-full h-72 bg-gray-950 overflow-hidden">
                            {/* Candlelight glow */}
                            <div className="absolute top-8 left-1/3 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
                            <div className="absolute top-6 right-1/3 w-16 h-16 bg-amber-400/15 rounded-full blur-xl" />
                            {/* Column pillars */}
                            <div className="absolute left-8 top-0 bottom-0 w-6 bg-linear-to-r from-gray-700 to-gray-800 rounded" />
                            <div className="absolute right-8 top-0 bottom-0 w-6 bg-linear-to-l from-gray-700 to-gray-800 rounded" />
                            {/* Candles */}
                            <div className="absolute top-10 left-16 flex flex-col items-center gap-0">
                                <div className="w-1.5 h-3 bg-amber-200 rounded-full blur-sm opacity-90" />
                                <div className="w-2 h-10 bg-amber-100/80 rounded" />
                            </div>
                            <div className="absolute top-14 right-16 flex flex-col items-center">
                                <div className="w-1.5 h-3 bg-amber-200 rounded-full blur-sm opacity-70" />
                                <div className="w-2 h-8 bg-amber-100/60 rounded" />
                            </div>
                            {/* Two figures */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-3">
                                {/* Woman */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-gray-600 rounded-full" />
                                    <div className="w-14 h-32 bg-linear-to-b from-gray-700 to-gray-900 rounded-t-2xl" />
                                </div>
                                {/* Man */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                                    <div className="w-16 h-36 bg-linear-to-b from-slate-800 to-slate-950 rounded-t-2xl" />
                                </div>
                            </div>
                            {/* Title text */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
                                <p className="text-amber-200/50 text-[10px] tracking-[0.3em] uppercase font-light whitespace-nowrap">The Crimson Throne</p>
                            </div>
                        </div>

                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-dark-border">
                            <div className="flex items-center gap-1">
                                <span className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px]">♥</span>
                                <span>{likeCount.toLocaleString()} Likes</span>
                            </div>
                            <div className="flex gap-3">
                                <span>315 Comments</span>
                                <span>34 Shares</span>
                            </div>
                        </div>

                        <div className="px-2 py-1 flex items-center justify-around">
                            <button onClick={handleLike}
                                className={`flx items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${liked ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" : "text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised"
                                    }`}>
                                <Heart className={`w-4 h-4  ${liked ? "fill-rose-500 text-rose-500" : ""}`} />

                            </button>
                            <button className="flx items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised transition-colors">
                                <MessageCircle className="w-4 h-4" />

                            </button>
                            <button className="fex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-dark-raised transition-colors">
                                <Share2 className="w-4 h-4" />

                            </button>
                        </div>
                    </div>


                </div>

                {/* Right Sidebar */}
                <div className="flex flex-col gap-4">
                    {/* Trending */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Trending Topics</h2>
                            <Flame className="w-4 h-4 text-rose-500" />
                        </div>
                        <ul className="flex flex-col gap-3">
                            {trendingTopics.map((topic) => (
                                <li key={topic.tag} className="flex items-center justify-between">
                                    <span className="text-rose-500 text-sm font-semibold hover:underline cursor-pointer">{topic.tag}</span>
                                    <span className="text-xs text-gray-400 dark:text-neutral-500">{topic.posts}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Popular Members */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                        <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Popular Members</h2>
                        <ul className="flex flex-col gap-4">
                            {popularMembers.map((member) => (
                                <li key={member.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                            {member.initials}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-neutral-100 leading-tight">{member.name}</p>
                                            <p className="text-xs text-gray-400 dark:text-neutral-500">{member.followers}</p>
                                        </div>
                                    </div>
                                    <button className="text-xs border border-rose-400 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1 rounded-lg font-semibold transition-colors">
                                        Follow
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Online Now */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Online Now</h2>
                            <span className="w-2 h-2 bg-green-400 rounded-full" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {onlineColors.map((color, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white dark:border-dark-card shadow-sm`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
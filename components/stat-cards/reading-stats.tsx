"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useLocale, useTranslations } from "next-intl";

type Range = "year" | "month" | "lastYear";

type Stats = {
    totalBooks: number;
    books: { key: number; count: number }[];
    genres: { name: string; count: number; percent: number }[];
    streak: { days: number; recent: boolean[] };
    activeDay: { index: number; perDay: number[] };
};

// Monday to Sunday as one letter (or the language's shortest form)
const weekdayLetters = (locale: string) =>
    Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(Date.UTC(2024, 0, 1 + i))));

const COLORS = [
    "#ef4444",
    "#ec4899",
    "#818cf8",
    "#34d399",
    "#fbbf24",
];

// 13320 seconds -> "3h 42m" (in the reader's language)
const formatDuration = (seconds: number, locale: string) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const unit = (value: number, name: "hour" | "minute") =>
        new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "narrow" }).format(value);
    if (hours > 0) return minutes > 0 ? `${unit(hours, "hour")} ${unit(minutes, "minute")}` : unit(hours, "hour");
    return unit(Math.max(minutes, 1), "minute");
};

export function GenreChart({ genres }: { genres: Stats["genres"] }) {
    return (
        <div className="flex flex-col items-center">
            <PieChart width={250} height={250}>
                <Pie
                    data={genres}
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="percent"
                    nameKey="name">
                    {genres.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>

            <div className="w-full mt-4 space-y-2">
                {genres.map((genre, index) => (
                    <div key={genre.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="truncate">{genre.name}</span>
                        </div>

                        <span className="font-medium">{genre.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReadingChart({ data }: { data: { label: string; books: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <XAxis dataKey="label" interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area
                    type="monotone"
                    dataKey="books"
                    stroke="#ef4444"
                    fill="var(--chart-area-fill)"
                />
                <Line
                    type="monotone"
                    dataKey="books"
                    stroke="#ef4444"
                    strokeWidth={3}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

interface StatsCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export default function StatsCard({ title, subtitle, children, className = "" }: StatsCardProps) {
    return (
        <div
            className={`bg-white dark:bg-dark-card border border-gray-200 dark:border-transparent w-full rounded-2xl p-5 shadow-sm dark:shadow-none ${className}`}>
            <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">{subtitle}</p>
                )}
            </div>

            {children}
        </div>
    );
}

// Shown while a card's numbers load, or when there is nothing to show yet
function CardState({ loading, text }: { loading: boolean; text: string }) {
    if (loading) return <div className="w-full h-full min-h-40 rounded-xl bg-gray-100 dark:bg-neutral-800 animate-pulse" />;
    return <p className="text-sm text-gray-400 dark:text-neutral-500 text-center">{text}</p>;
}

export function ReadingStats({ onTotal }: { onTotal?: (total: number) => void }) {
    const t = useTranslations("Stats");
    const locale = useLocale();
    const [range, setRange] = useState<Range>("year");
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    // Loads again whenever the reader changes the period. An older answer never replaces a newer one.
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setFailed(false);
        fetch(`/api/reading-stats?range=${range}`, { credentials: "include", cache: "no-store" })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
            .then((data: Stats) => {
                if (!alive) return;
                setStats(data);
                onTotal?.(data.totalBooks);
            })
            .catch(() => { if (alive) setFailed(true); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
        // onTotal is a setState from the page; it never needs to re-run this
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const subtitle = range === "month" ? t("thisMonth") : range === "lastYear" ? t("lastYear") : t("thisYear");

    const chartData = (stats?.books ?? []).map((b) => ({
        label: range === "month"
            ? String(b.key)
            : new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(Date.UTC(2024, b.key - 1, 1))),
        books: b.count,
    }));
    const hasBooks = chartData.some((d) => d.books > 0);
    const emptyText = failed ? t("loadFailed") : t("noData");

    const active = stats?.activeDay;
    const activeIndex = active?.index ?? -1;
    const maxSeconds = Math.max(1, ...(active?.perDay ?? [0]));

    return (
        <section className="space-y-5 mt-8 pt-8 w-full mx-auto">
            <div className="bg-white dark:bg-transparent p-4 md:p-8 dark:px-0">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold">{t("title")}</h2>
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as Range)}
                        className="border border-gray-100 dark:border-dark-border dark:bg-dark-card rounded-lg px-3 py-2">
                        <option value="year">{t("thisYear")}</option>
                        <option value="month">{t("thisMonth")}</option>
                        <option value="lastYear">{t("lastYear")}</option>
                    </select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Line Chart */}
                    <StatsCard title={t("booksOverTime")} subtitle={subtitle} className="md:col-span-2 w-full md:w-[85%] min-h-95">
                        <div className="w-full h-75 md:h-100 flex items-center justify-center">
                            {!loading && hasBooks ? <ReadingChart data={chartData} /> : <CardState loading={loading} text={emptyText} />}
                        </div>
                    </StatsCard>

                    {/* Genre Chart */}
                    <StatsCard title={t("booksByGenre")} subtitle={subtitle} className="min-h-95">
                        <div className="min-h-75 flex items-center justify-center text-gray-400 dark:text-neutral-500">
                            {!loading && stats && stats.genres.length > 0 ? <GenreChart genres={stats.genres} /> : <CardState loading={loading} text={emptyText} />}
                        </div>
                    </StatsCard>
                </div>
            </div>


            <div className="grid lg:grid-cols-2 gap-5 w-full lg:w-[90%] mx-auto bg-white dark:bg-transparent p-4 dark:px-0">
                {/* Streak */}
                <StatsCard title={t("streak")} className="min-h-95">
                    {loading || !stats ? (
                        <CardState loading={loading} text={emptyText} />
                    ) : (
                        <>
                            <div className="mb-6">
                                <span className="text-5xl font-bold">{stats.streak.days.toLocaleString(locale)}</span>
                                <span className="ml-2 text-gray-500 dark:text-neutral-400">{t("days")}</span>
                            </div>

                            <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                {[...stats.streak.recent].reverse().map((read, i) => (
                                    <div key={i} className={`h-12 rounded-md ${read ? (i === 0 ? "bg-red-500 dark:bg-red-600" : "bg-red-500 dark:bg-red-300") : "bg-gray-200 dark:bg-neutral-100"}`} />
                                ))}
                            </div>
                        </>
                    )}
                </StatsCard>

                {/* Most Active Day */}
                <StatsCard title={t("mostActiveDay")} className="min-h-95">
                    {loading || !stats || !active ? (
                        <CardState loading={loading} text={emptyText} />
                    ) : activeIndex < 0 ? (
                        <CardState loading={false} text={t("noData")} />
                    ) : (
                        <>
                            <div>
                                <h2 className="text-4xl font-bold">{new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(Date.UTC(2024, 0, 1 + activeIndex)))}</h2>
                                <p className="text-gray-500 dark:text-neutral-400 mt-2">{t("avgTime", { time: formatDuration(active.perDay[activeIndex], locale) })}</p>
                            </div>
                            <div className="flex justify-between items-end mt-10 h-24 gap-2">
                                {active.perDay.map((s, i) => (
                                    <div key={i} className="flex-1 flex items-end justify-center h-full">
                                        <div
                                            className={`w-full max-w-6 rounded-md ${i === activeIndex ? "bg-red-500 dark:bg-red-600" : "bg-gray-200 dark:bg-neutral-700"}`}
                                            style={{ height: `${s > 0 ? Math.max(6, Math.round((s / maxSeconds) * 100)) : 0}%` }} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between gap-2 mt-2 text-gray-400 dark:text-neutral-500 text-sm">
                                {weekdayLetters(locale).map((d, i) => <span key={i} className="flex-1 text-center">{d}</span>)}
                            </div>
                        </>
                    )}
                </StatsCard>
            </div>
        </section>
    );
}
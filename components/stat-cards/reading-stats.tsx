import { PieChart, Pie, Cell, Tooltip, Line, XAxis, YAxis, LineChart, ResponsiveContainer, Area, AreaChart, } from "recharts";

const genreData = [
    { name: "Fantasy", value: 45 },
    { name: "Romance", value: 25 },
    { name: "Mystery", value: 15 },
    { name: "Adventure", value: 10 },
    { name: "Drama", value: 5 },
];

const COLORS = [
    "#ef4444",
    "#ec4899",
    "#818cf8",
    "#34d399",
    "#fbbf24",
];

export function GenreChart() {
    return (
        <div className="flex flex-col items-center">
            <PieChart width={250} height={250}>
                <Pie
                    data={genreData}
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="value">
                    {genreData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>

            <div className="w-full mt-4 space-y-2">
                {genreData.map((genre, index) => (
                    <div key={genre.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                            <span>{genre.name}</span>
                        </div>

                        <span className="font-medium">{genre.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}


const readingData = [
    { month: "Jan", books: 8 },
    { month: "Feb", books: 14 },
    { month: "Mar", books: 11 },
    { month: "Apr", books: 19 },
    { month: "May", books: 22 },
    { month: "Jun", books: 28 },
];

export function ReadingChart() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={readingData}>
                <XAxis dataKey="month" />
                <YAxis />
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


export function ReadingStats() {
    return (
        <section className="space-y-5 mt-8 pt-8 w-full mx-auto">
            <div className="bg-white dark:bg-transparent p-4 md:p-8 dark:px-0">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold">Reading Stats</h2>
                    <select className="border border-gray-100 dark:border-dark-border dark:bg-dark-card rounded-lg px-3 py-2">
                        <option>This Year</option>
                        <option>This Month</option>
                        <option>Last Year</option>
                    </select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Line Chart */}
                    <StatsCard title="Books Read Over Time" subtitle="Last 6 months" className="md:col-span-2 w-full md:w-[85%] min-h-95">
                        <div className="w-full h-75 md:h-100">
                            <ReadingChart />
                        </div>
                    </StatsCard>

                    {/* Genre Chart */}
                    <StatsCard title="Books by Genre" className="min-h-95">
                        <div className="h-95 flex items-center justify-center text-gray-400 dark:text-neutral-500">
                            <GenreChart />
                        </div>
                    </StatsCard>
                </div>
            </div>


            <div className="grid lg:grid-cols-2 gap-5 w-full lg:w-[90%] mx-auto bg-white dark:bg-transparent p-4 dark:px-0">
                {/* Streak */}
                <StatsCard title="Reading Streak" className="min-h-95">
                    <div className="mb-6">
                        <span className="text-5xl font-bold">28</span>
                        <span className="ml-2 text-gray-500 dark:text-neutral-400">days</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-3">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className={`h-12 rounded-md ${i < 21 ? (i === 20 ? "bg-red-500 dark:bg-red-600" : "bg-red-500 dark:bg-red-300") : "bg-gray-200 dark:bg-neutral-100"}`} />
                        ))}
                    </div>
                </StatsCard>

                {/* Most Active Day */}
                <StatsCard title="Most Active Day" className="min-h-95">
                    <div>
                        <h2 className="text-4xl font-bold">Sunday</h2>
                        <p className="text-gray-500 dark:text-neutral-400 mt-2">Avg. 3h 42m reading time</p>
                    </div>
                    <div className="flex justify-between mt-20 text-gray-400 dark:text-neutral-500 text-sm">
                        <span>M</span>
                        <span>T</span>
                        <span>W</span>
                        <span>T</span>
                        <span>F</span>
                        <span>S</span>
                        <span>S</span>
                    </div>
                </StatsCard>
            </div>
        </section>
    );
}
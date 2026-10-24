// lib/readingStats.ts
// The numbers on the reader's profile: books read over time, books by genre, reading streak, most active day.
//  - A "book read" is a book the reader opened and read at least one chapter of (reading_progress),
//    counted in the month (or day) they last read it.
//  - Reading time per day is recorded from the same server-measured "still reading" signal that pays reading rewards,
//    so the browser can never inflate it. Days are the reader's own days (users.timezone).
import "server-only";
import { dbPool } from "@/lib/db";

export type StatsRange = "year" | "month" | "lastYear";

const STORY_TENANT = process.env.STORY_TENANT || null;

// A day counts for the streak once the reader has read this long
export const STREAK_MIN_SECONDS = 60;
// "Most active day" looks at this many recent weeks
const ACTIVE_DAY_WEEKS = 12;
// How far back the streak can count
const STREAK_LOOK_BACK_DAYS = 730;
// The days shown under the streak number
const RECENT_DAYS = 28;
// The same rules as the reading reward signal (lib/readingRewards.ts)
const BEAT_MIN_GAP_SECONDS = 25;   // signals closer than this are ignored
const BEAT_MAX_GAP_SECONDS = 75;   // a longer gap means the reader stopped, nothing is counted
const BEAT_MAX_ADD_SECONDS = 60;   // at most this much per signal

// The reader's timezone (falls back to UTC when it isn't set or isn't valid)
const READER_TZ = `WITH me AS (
    SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = u.timezone) THEN u.timezone ELSE 'UTC' END AS tz
    FROM users u WHERE u.id = $1
)`;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, delta: number) => {
    const [y, m, d] = day.split("-").map(Number);
    return iso(new Date(Date.UTC(y, m - 1, d + delta)));
};

// One "still reading" signal, added to today's reading time. Never throws: rewards must not depend on it.
export async function recordDailyReading(userId: string): Promise<void> {
    try {
        await dbPool.query(
            `${READER_TZ}
             INSERT INTO reading_daily (user_id, day, seconds, last_beat_at)
             SELECT $1, (now() AT TIME ZONE me.tz)::date, 0, now() FROM me
             ON CONFLICT (user_id, day) DO UPDATE SET
                 seconds = reading_daily.seconds + CASE
                     WHEN now() - reading_daily.last_beat_at <= make_interval(secs => $3::double precision)
                     THEN LEAST(FLOOR(EXTRACT(EPOCH FROM now() - reading_daily.last_beat_at))::int, $4::int)
                     ELSE 0 END,
                 last_beat_at = now()
             WHERE reading_daily.last_beat_at <= now() - make_interval(secs => $2::double precision)`,
            [userId, BEAT_MIN_GAP_SECONDS, BEAT_MAX_GAP_SECONDS, BEAT_MAX_ADD_SECONDS]
        );
    } catch (error) {
        console.error("Daily reading record failed:", error);
    }
}

export type ReadingStatsResult = {
    totalBooks: number;                                          // every book read, all time
    books: { key: number; count: number }[];                     // per month (1-12) or per day of the month
    genres: { name: string; count: number; percent: number }[];  // top 5
    streak: { days: number; recent: boolean[] };                 // recent = last 28 days, oldest first, today last
    activeDay: { index: number; perDay: number[] };              // index 0 = Monday, -1 = no data; perDay = average seconds
};

const EMPTY: ReadingStatsResult = {
    totalBooks: 0,
    books: [],
    genres: [],
    streak: { days: 0, recent: Array<boolean>(RECENT_DAYS).fill(false) },
    activeDay: { index: -1, perDay: Array<number>(7).fill(0) },
};

export async function getReadingStats(userId: string, range: StatsRange): Promise<ReadingStatsResult> {
    const { rows: me } = await dbPool.query(
        `${READER_TZ}
         SELECT me.tz, to_char((now() AT TIME ZONE me.tz)::date, 'YYYY-MM-DD') AS today FROM me`,
        [userId]
    );
    if (!me[0]) return EMPTY;
    const tz: string = me[0].tz;
    const today: string = me[0].today;
    const [year, month, day] = today.split("-").map(Number);

    // The periods the book charts cover
    let start: string;
    let end: string;
    let unit: "month" | "day";
    let count: number;
    if (range === "month") {
        start = `${year}-${pad(month)}-01`;
        end = today;
        unit = "day";
        count = day;
    } else if (range === "lastYear") {
        start = `${year - 1}-01-01`;
        end = `${year - 1}-12-31`;
        unit = "month";
        count = 12;
    } else {
        start = `${year}-01-01`;
        end = today;
        unit = "month";
        count = month;
    }

    const [booksRes, totalRes, dailyRes] = await Promise.all([
        dbPool.query(
            // unit is one of two fixed words above, never user input
            `SELECT EXTRACT(${unit} FROM (rp.last_read_at AT TIME ZONE $2))::int AS bucket,
                    COALESCE(NULLIF(trim(s.genre), ''), '') AS genre,
                    COUNT(*)::int AS n
             FROM reading_progress rp
             JOIN stories s ON s.id = rp.story_id
             WHERE rp.user_id = $1 AND rp.max_chapter >= 1 AND s.is_deleted = false
               AND ($5::text IS NULL OR $5 = ANY(s.tenants))
               AND (rp.last_read_at AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
             GROUP BY 1, 2`,
            [userId, tz, start, end, STORY_TENANT]
        ),
        dbPool.query(
            `SELECT COUNT(*)::int AS n
             FROM reading_progress rp
             JOIN stories s ON s.id = rp.story_id
             WHERE rp.user_id = $1 AND rp.max_chapter >= 1 AND s.is_deleted = false
               AND ($2::text IS NULL OR $2 = ANY(s.tenants))`,
            [userId, STORY_TENANT]
        ),
        dbPool.query(
            `SELECT to_char(day, 'YYYY-MM-DD') AS day, seconds
             FROM reading_daily
             WHERE user_id = $1 AND day >= $2::date AND day <= $3::date`,
            [userId, addDays(today, -STREAK_LOOK_BACK_DAYS), today]
        ),
    ]);

    // Books over time, and the genres of those same books
    const perBucket = new Map<number, number>();
    const perGenre = new Map<string, number>();
    for (const r of booksRes.rows) {
        perBucket.set(r.bucket, (perBucket.get(r.bucket) ?? 0) + r.n);
        if (r.genre) perGenre.set(r.genre, (perGenre.get(r.genre) ?? 0) + r.n);
    }
    const books = Array.from({ length: count }, (_, i) => ({ key: i + 1, count: perBucket.get(i + 1) ?? 0 }));
    const genreTotal = [...perGenre.values()].reduce((a, b) => a + b, 0);
    const genres = [...perGenre.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([name, n]) => ({ name, count: n, percent: genreTotal > 0 ? Math.round((n / genreTotal) * 100) : 0 }));

    // Reading streak: days in a row up to today (or up to yesterday if they haven't read yet today)
    const daily: { day: string; seconds: number }[] = dailyRes.rows;
    const readDays = new Set(daily.filter((r) => r.seconds >= STREAK_MIN_SECONDS).map((r) => r.day));
    let cursor = readDays.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (readDays.has(cursor)) {
        streak++;
        cursor = addDays(cursor, -1);
    }
    const recent = Array.from({ length: RECENT_DAYS }, (_, i) => readDays.has(addDays(today, i - (RECENT_DAYS - 1))));

    // Most active day: the weekday with the most reading on average, over the days the reader actually read
    const since = addDays(today, -(ACTIVE_DAY_WEEKS * 7 - 1));
    const sums = Array<number>(7).fill(0);
    const days = Array<number>(7).fill(0);
    for (const r of daily) {
        if (r.day < since || r.seconds <= 0) continue;
        const [y, m, d] = r.day.split("-").map(Number);
        const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
        sums[weekday] += r.seconds;
        days[weekday] += 1;
    }
    const perDay = sums.map((s, i) => (days[i] > 0 ? Math.round(s / days[i]) : 0));
    const best = Math.max(...perDay);
    const index = best > 0 ? perDay.indexOf(best) : -1;

    return {
        totalBooks: Number(totalRes.rows[0]?.n ?? 0),
        books,
        genres,
        streak: { days: streak, recent },
        activeDay: { index, perDay },
    };
}
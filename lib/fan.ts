// lib/fans.ts
// Who has given a book the most, built only from data that already exists (nothing is stored for it):
//   gifts: the coins of the gifts a reader sent to the book (gift_sends), all-time
//   votes: the gems a reader voted with (book_votes); "monthly" = this month (UTC), "overall" = all-time
import "server-only";
import { dbPool } from "@/lib/db";

export type FanKind = "gifts" | "votes";
export type FanPeriod = "monthly" | "overall";

export type Fan = {
    rank: number;
    name: string | null;     // username, else full name (null = show "Anonymous reader")
    avatar: string | null;
    points: number;
    you: boolean;            // the signed-in reader
};

export type FanBoard = {
    fans: Fan[];             // the top fans, best first
    supporters: number;      // how many readers gave
    total: number;           // all points given
    me: { rank: number | null; points: number };
};

const MAX_FANS = 50;
const MONTH_START = `date_trunc('month', now() AT TIME ZONE 'UTC')`;

function totalsSql(kind: FanKind) {
    if (kind === "votes") {
        return `SELECT v.user_id, SUM(v.gems)::int AS points, 0 AS first_at
                FROM book_votes v
                WHERE v.story_id = $1
                  AND ($2::text = 'overall' OR v.month = ${MONTH_START}::date)
                GROUP BY v.user_id`;
    }
    return `SELECT g.sender_id AS user_id, SUM(g.coins)::int AS points, MIN(g.created_at) AS first_at
            FROM gift_sends g
            WHERE g.story_id = $1
              AND ($2::text = 'overall' OR g.created_at >= ${MONTH_START} AT TIME ZONE 'UTC')
            GROUP BY g.sender_id`;
}

export async function getFanBoard(storyId: string, kind: FanKind, period: FanPeriod, viewerId: string | null): Promise<FanBoard> {
    const { rows } = await dbPool.query(
        `WITH totals AS (${totalsSql(kind)}),
         ranked AS (
             SELECT t.user_id, t.points,
                    ROW_NUMBER() OVER (ORDER BY t.points DESC, t.first_at, t.user_id)::int AS rank,
                    COUNT(*) OVER ()::int AS supporters,
                    SUM(t.points) OVER ()::int AS total
             FROM totals t
         )
         SELECT r.rank, r.user_id, r.points, r.supporters, r.total, rp.username, rp.full_name, rp.avatar_url
         FROM ranked r
         LEFT JOIN reader_profiles rp ON rp.user_id = r.user_id
         WHERE r.rank <= $3::int OR r.user_id = $4::uuid
         ORDER BY r.rank`,
        [storyId, period, MAX_FANS, viewerId]
    );

    const mine = viewerId ? rows.find((r) => r.user_id === viewerId) : undefined;
    return {
        fans: rows
            .filter((r) => r.rank <= MAX_FANS)
            .map((r) => ({
                rank: r.rank as number,
                name: (r.username || r.full_name || null) as string | null,
                avatar: (r.avatar_url || null) as string | null,
                points: r.points as number,
                you: viewerId != null && r.user_id === viewerId,
            })),
        supporters: rows[0]?.supporters ?? 0,
        total: rows[0]?.total ?? 0,
        me: { rank: mine?.rank ?? null, points: mine?.points ?? 0 },
    };
}

// The Leaderboard Impact block: how many readers gifted the book, and this month's top voters
export type FanSummary = {
    supporters: number;
    top: { name: string | null; avatar: string | null }[];
};

export async function getFanSummary(storyId: string): Promise<FanSummary> {
    const [count, votes] = await Promise.all([
        dbPool.query(`SELECT COUNT(DISTINCT sender_id)::int AS n FROM gift_sends WHERE story_id = $1`, [storyId]),
        getFanBoard(storyId, "votes", "monthly", null),
    ]);
    return {
        supporters: count.rows[0]?.n ?? 0,
        top: votes.fans.slice(0, 3).map((f) => ({ name: f.name, avatar: f.avatar })),
    };
}

// The gifts tab of the gift card: all gifts the book received, the top three and the reader's own place
export type GiftPanel = {
    gifts: number;
    fans: Fan[];
    me: { rank: number | null; points: number };
};

export async function getGiftPanel(storyId: string, viewerId: string | null): Promise<GiftPanel> {
    const [board, count] = await Promise.all([
        getFanBoard(storyId, "gifts", "overall", viewerId),
        dbPool.query(`SELECT COUNT(*)::int AS n FROM gift_sends WHERE story_id = $1`, [storyId]),
    ]);
    return { gifts: count.rows[0]?.n ?? 0, fans: board.fans.slice(0, 3), me: board.me };
}
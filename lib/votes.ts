// lib/votes.ts
// Monthly votes for a book, paid with gems (1 gem = 1 vote). Votes count for the current month (UTC)
// and the ranking starts from zero on the 1st. Gems have no money value, so votes earn the author nothing.
import "server-only";
import { dbPool } from "@/lib/db";
import { withTransaction } from "@/lib/auth/transaction";
import { getWalletBalance, type WalletBalance } from "@/lib/wallet";
import type { Msg } from "@/lib/i18n";

export const MAX_GEMS_PER_VOTE = 1000;

// The first day of the current month, UTC
const THIS_MONTH = `date_trunc('month', now() AT TIME ZONE 'UTC')::date`;

export type BookVotes = { votes: number; voters: number };

export type VoteResult =
    | { ok: true; gems: number; votes: BookVotes; wallet: WalletBalance }
    | { ok: false; code: "NOT_FOUND" | "OWN_BOOK" | "NOT_ENOUGH" | "ACCOUNT"; message: Msg; wallet?: WalletBalance };

class StopVote extends Error {
    constructor(public result: VoteResult) {
        super(result.ok ? "ok" : result.code);
    }
}

// This month's votes for a book, and how many readers gave them
export async function getBookVotes(storyId: string): Promise<BookVotes> {
    const { rows } = await dbPool.query(
        `SELECT COALESCE(SUM(gems), 0)::int AS votes, COUNT(DISTINCT user_id)::int AS voters
         FROM book_votes WHERE story_id = $1 AND month = ${THIS_MONTH}`,
        [storyId]
    );
    return { votes: Number(rows[0]?.votes ?? 0), voters: Number(rows[0]?.voters ?? 0) };
}

// Spends `gems` gems on votes for a book. All or nothing.
export async function voteForBook(userId: string, storyId: string, gems: number): Promise<VoteResult> {
    try {
        await withTransaction(async (client) => {
            const { rows: account } = await client.query(
                `SELECT COALESCE(account_status, 'active') AS status FROM users WHERE id = $1 FOR UPDATE`,
                [userId]
            );
            if (account[0]?.status !== "active") {
                throw new StopVote({ ok: false, code: "ACCOUNT", message: "cantVote" });
            }

            const { rows: books } = await client.query(
                `SELECT s.user_id AS creator_id
                 FROM stories s
                 WHERE s.id = $1
                   AND COALESCE(s.is_deleted, false) = false
                   AND EXISTS (SELECT 1 FROM chapters c WHERE c.story_id = s.id AND c.status = 'published')`,
                [storyId]
            );
            const book = books[0];
            if (!book) throw new StopVote({ ok: false, code: "NOT_FOUND", message: "storyNotFound" });
            if (book.creator_id === userId) throw new StopVote({ ok: false, code: "OWN_BOOK", message: "cantVoteOwnBook" });

            // Gems, soonest to expire first (gems normally never expire), then oldest first
            const { rows: lots } = await client.query(
                `SELECT id, remaining
                 FROM wallet_lots
                 WHERE user_id = $1 AND currency = 'gem' AND remaining > 0
                   AND (expires_at IS NULL OR expires_at > now())
                 ORDER BY expires_at NULLS LAST, created_at, id
                 FOR UPDATE`,
                [userId]
            );
            const available = lots.reduce((sum: number, l: any) => sum + Number(l.remaining), 0);
            if (available < gems) throw new StopVote({ ok: false, code: "NOT_ENOUGH", message: "notEnoughGems" });

            const { rows: vote } = await client.query(
                `INSERT INTO book_votes (user_id, story_id, gems, month) VALUES ($1, $2, $3, ${THIS_MONTH}) RETURNING id`,
                [userId, storyId, gems]
            );

            let left = gems;
            for (const lot of lots) {
                if (left <= 0) break;
                const take = Math.min(Number(lot.remaining), left);
                left -= take;
                await client.query(`UPDATE wallet_lots SET remaining = remaining - $2 WHERE id = $1`, [lot.id, take]);
                await client.query(
                    `INSERT INTO wallet_ledger (user_id, lot_id, currency, kind, delta, reason, ref_type, ref_id)
                     VALUES ($1, $2, 'gem', 'earned', $3, 'vote', 'vote', $4)`,
                    [userId, lot.id, -take, String(vote[0].id)]
                );
            }
        });
        return { ok: true, gems, votes: await getBookVotes(storyId), wallet: await getWalletBalance(userId) };
    } catch (error) {
        if (error instanceof StopVote) {
            const r = error.result;
            if (!r.ok && r.code === "NOT_ENOUGH") return { ...r, wallet: await getWalletBalance(userId) };
            return r;
        }
        throw error;
    }
}
// lib/community.ts
// Community posts, likes, comments, polls and trending tags. Following uses the authors' own follow (lib/authors.ts).
import "server-only";
import { dbPool } from "@/lib/db";

export const POST_MAX = 2000;
export const COMMENT_MAX = 1000;
export const POLL_OPTION_MAX = 60;
const PAGE = 10;
const COMMENT_PAGE = 20;
const POSTS_PER_HOUR = 10;
const COMMENTS_PER_HOUR = 30;

export const validId = (v: unknown): v is string => typeof v === "string" && /^\d{1,18}$/.test(v);

export type Person = {
    id: string;
    public_id: string | null;
    name: string | null;
    username: string | null;
    slug: string | null;
    vip: "weekly" | "monthly" | null;
    avatar_url: string | null;
};

// votes is null until the reader has voted or the poll has ended (results stay hidden so early votes don't sway people)
export type CommunityPoll = {
    options: { label: string; votes: number | null }[];
    total: number;
    ends_at: string;
    ended: boolean;
    my_vote: number | null;
};

export type CommunityPost = {
    id: string;
    body: string;
    image_url: string | null;
    created_at: string;
    author: Person;
    likes: number;
    comments: number;
    liked: boolean;
    mine: boolean;
    poll: CommunityPoll | null;
    edited: boolean;
};

export type CommunityComment = {
    id: string;
    post_id: string;
    body: string;
    created_at: string;
    edited: boolean;
    author: Person;
    mine: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// Shown by username; the full name is only a fallback for readers who haven't set one.
// slug is set only when the poster is an author (their author page); vip is their active plan.
const person = (r: Row): Person => ({
    id: r.user_id,
    public_id: r.public_id ?? null,
    name: r.username || r.full_name || null,
    username: r.username ?? null,
    slug: r.author_slug ?? null,
    vip: r.vip_plan === "weekly" || r.vip_plan === "monthly" ? r.vip_plan : null,
    avatar_url: r.avatar_url ?? null,
});

function mapPoll(r: Row): CommunityPoll | null {
    if (!r.poll_options) return null;
    const counts: number[] = r.poll_counts ?? [];
    const myVote: number | null = r.poll_my_vote ?? null;
    const ended = !!r.poll_ended;
    const show = ended || myVote !== null;
    return {
        options: (r.poll_options as string[]).map((label, i) => ({ label, votes: show ? counts[i] ?? 0 : null })),
        total: counts.reduce((a, b) => a + b, 0),
        ends_at: r.poll_ends_at,
        ended,
        my_vote: myVote,
    };
}

const mapPost = (r: Row, viewerId: string | null): CommunityPost => ({
    id: r.id,
    body: r.body,
    image_url: r.image_url ?? null,
    created_at: r.created_at,
    edited: !!r.edited_at,
    author: person(r),
    likes: r.likes,
    comments: r.comments,
    liked: r.liked,
    mine: viewerId !== null && r.user_id === viewerId,
    poll: mapPoll(r),
});

type Query = { cursor?: string | null; author?: string | null; following?: boolean; id?: string | null; tag?: string | null; limit?: number };

async function queryPosts(viewerId: string | null, q: Query) {
    const limit = q.limit ?? PAGE;
    const { rows } = await dbPool.query(
        `SELECT p.id::text, p.body, p.image_url, p.created_at, p.edited_at, p.user_id,
                rp.public_id, rp.full_name, rp.username, rp.avatar_url,
                (SELECT fang_slugify(up.pen_name)
                   FROM user_profiles up
                   JOIN users au ON au.id = up.user_id
                  WHERE up.user_id = p.user_id
                    AND NULLIF(trim(up.pen_name), '') IS NOT NULL
                    AND COALESCE(au.role, '') NOT LIKE 'platform%'
                  ORDER BY up.created_at DESC
                  LIMIT 1) AS author_slug,
                (SELECT v.plan FROM vip_subscriptions v
                  WHERE v.user_id = p.user_id AND v.starts_at <= now() AND v.ends_at > now()
                  ORDER BY v.ends_at DESC
                  LIMIT 1) AS vip_plan,
                (SELECT COUNT(*)::int FROM community_likes l WHERE l.post_id = p.id) AS likes,
                (SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id AND NOT c.hidden) AS comments,
                EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = $1::uuid) AS liked,
                pl.options AS poll_options,
                pl.ends_at AS poll_ends_at,
                (pl.ends_at <= now()) AS poll_ended,
                CASE WHEN pl.post_id IS NULL THEN NULL ELSE (
                    SELECT COALESCE(array_agg(x.n ORDER BY x.i), '{}'::int[])
                    FROM (SELECT g.i, COUNT(v.user_id)::int AS n
                          FROM generate_series(0, array_length(pl.options, 1) - 1) AS g(i)
                          LEFT JOIN community_poll_votes v ON v.post_id = p.id AND v.option_idx = g.i
                          GROUP BY g.i) x
                ) END AS poll_counts,
                (SELECT v.option_idx::int FROM community_poll_votes v
                  WHERE v.post_id = p.id AND v.user_id = $1::uuid) AS poll_my_vote
         FROM community_posts p
         LEFT JOIN reader_profiles rp ON rp.user_id = p.user_id
         LEFT JOIN community_polls pl ON pl.post_id = p.id
         WHERE NOT p.hidden
           AND ($2::bigint IS NULL OR p.id < $2::bigint)
           AND ($3::uuid IS NULL OR p.user_id = $3::uuid)
           AND ($4::boolean = false OR p.user_id IN (SELECT author_id FROM author_follows WHERE reader_id = $1::uuid))
           AND ($5::bigint IS NULL OR p.id = $5::bigint)
           AND ($7::text IS NULL OR p.body ~* ('(^|[^A-Za-z0-9_])#' || $7::text || '([^A-Za-z0-9_]|$)'))
         ORDER BY p.id DESC
         LIMIT $6`,
        [viewerId, q.cursor ?? null, q.author ?? null, q.following ?? false, q.id ?? null, limit + 1, q.tag ?? null]
    );
    const hasMore = rows.length > limit;
    const posts = rows.slice(0, limit).map((r) => mapPost(r, viewerId));
    return { posts, nextCursor: hasMore ? posts[posts.length - 1].id : null };
}

export const listPosts = (viewerId: string | null, q: Query) => queryPosts(viewerId, q);

export async function getPost(viewerId: string | null, id: string) {
    const { posts } = await queryPosts(viewerId, { id, limit: 1 });
    return posts[0] ?? null;
}

export async function createPost(
    userId: string,
    body: string,
    imageUrl: string | null,
    poll: { options: string[]; days: number } | null = null
) {
    const { rows: recent } = await dbPool.query(
        `SELECT COUNT(*)::int AS n FROM community_posts WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
        [userId]
    );
    if (recent[0].n >= POSTS_PER_HOUR) return { error: "tooManyPosts" as const };

    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO community_posts (user_id, body, image_url) VALUES ($1, $2, $3) RETURNING id::text`,
            [userId, body, imageUrl]
        );
        if (poll) {
            await client.query(
                `INSERT INTO community_polls (post_id, options, ends_at)
                 VALUES ($1, $2::text[], now() + make_interval(days => $3::int))`,
                [rows[0].id, poll.options, poll.days]
            );
        }
        await client.query("COMMIT");
        return { id: rows[0].id as string };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        throw error;
    } finally {
        client.release();
    }
}

// One vote per reader, can't be changed. Returns the post with its poll results.
export async function votePoll(userId: string, postId: string, option: number) {
    const { rows } = await dbPool.query(
        `SELECT array_length(pl.options, 1) AS n, (pl.ends_at <= now()) AS ended
         FROM community_polls pl
         JOIN community_posts p ON p.id = pl.post_id
         WHERE pl.post_id = $1 AND NOT p.hidden`,
        [postId]
    );
    if (!rows[0]) return { error: "pollNotFound" as const };
    if (rows[0].ended) return { error: "pollEnded" as const };
    if (!Number.isInteger(option) || option < 0 || option >= rows[0].n) return { error: "pollInvalid" as const };

    const ins = await dbPool.query(
        `INSERT INTO community_poll_votes (post_id, user_id, option_idx) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [postId, userId, option]
    );
    if ((ins.rowCount ?? 0) === 0) return { error: "pollAlreadyVoted" as const };
    return { post: await getPost(userId, postId) };
}

export async function deleteOwnPost(userId: string, id: string) {
    const { rowCount } = await dbPool.query(`DELETE FROM community_posts WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (rowCount ?? 0) > 0;
}

export async function toggleLike(userId: string, postId: string) {
    const { rowCount: exists } = await dbPool.query(
        `SELECT 1 FROM community_posts WHERE id = $1 AND NOT hidden`,
        [postId]
    );
    if (!exists) return null;
    const del = await dbPool.query(`DELETE FROM community_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    let liked = false;
    if ((del.rowCount ?? 0) === 0) {
        await dbPool.query(
            `INSERT INTO community_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [postId, userId]
        );
        liked = true;
    }
    const { rows } = await dbPool.query(`SELECT COUNT(*)::int AS n FROM community_likes WHERE post_id = $1`, [postId]);
    return { liked, likes: rows[0].n as number };
}

const COMMENT_SELECT = `
      SELECT c.id::text, c.post_id::text, c.body, c.created_at, c.edited_at, c.user_id,
           rp.public_id, rp.full_name, rp.username, rp.avatar_url,
           (SELECT fang_slugify(up.pen_name)
              FROM user_profiles up
              JOIN users au ON au.id = up.user_id
             WHERE up.user_id = c.user_id
               AND NULLIF(trim(up.pen_name), '') IS NOT NULL
               AND COALESCE(au.role, '') NOT LIKE 'platform%'
             ORDER BY up.created_at DESC
             LIMIT 1) AS author_slug,
           (SELECT v.plan FROM vip_subscriptions v
             WHERE v.user_id = c.user_id AND v.starts_at <= now() AND v.ends_at > now()
             ORDER BY v.ends_at DESC
             LIMIT 1) AS vip_plan
    FROM community_comments c
    LEFT JOIN reader_profiles rp ON rp.user_id = c.user_id`;

const mapComment = (r: Row, viewerId: string | null): CommunityComment => ({
    id: r.id,
    post_id: r.post_id,
    body: r.body,
    created_at: r.created_at,
    edited: !!r.edited_at,
    author: person(r),
    mine: viewerId !== null && r.user_id === viewerId,
});

export async function listComments(viewerId: string | null, postId: string, cursor: string | null) {
    const { rows } = await dbPool.query(
        `${COMMENT_SELECT}
         WHERE c.post_id = $1 AND NOT c.hidden AND ($2::bigint IS NULL OR c.id < $2::bigint)
         ORDER BY c.id DESC
         LIMIT $3`,
        [postId, cursor, COMMENT_PAGE + 1]
    );
    const hasMore = rows.length > COMMENT_PAGE;
    const comments = rows.slice(0, COMMENT_PAGE).map((r) => mapComment(r, viewerId));
    return { comments, nextCursor: hasMore ? comments[comments.length - 1].id : null };
}

export async function addComment(userId: string, postId: string, body: string) {
    const { rowCount: exists } = await dbPool.query(
        `SELECT 1 FROM community_posts WHERE id = $1 AND NOT hidden`,
        [postId]
    );
    if (!exists) return { error: "postNotFound" as const };
    const { rows: recent } = await dbPool.query(
        `SELECT COUNT(*)::int AS n FROM community_comments WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
        [userId]
    );
    if (recent[0].n >= COMMENTS_PER_HOUR) return { error: "tooManyComments" as const };
    const { rows: ins } = await dbPool.query(
        `INSERT INTO community_comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING id`,
        [postId, userId, body]
    );
    const { rows } = await dbPool.query(`${COMMENT_SELECT} WHERE c.id = $1`, [ins[0].id]);
    return { comment: mapComment(rows[0], userId) };
}

export async function deleteOwnComment(userId: string, id: string) {
    const { rowCount } = await dbPool.query(`DELETE FROM community_comments WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (rowCount ?? 0) > 0;
}

// Edit your own post's text. A poll's options and an image stay as posted; a poll post must keep its question.
export async function editOwnPost(userId: string, id: string, body: string) {
    const { rowCount } = await dbPool.query(
        `UPDATE community_posts p SET body = $3::text, edited_at = now()
         WHERE p.id = $1 AND p.user_id = $2 AND NOT p.hidden
           AND (length($3::text) > 0 OR (p.image_url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM community_polls pl WHERE pl.post_id = p.id)))`,
        [id, userId, body]
    );
    if ((rowCount ?? 0) === 0) return null;
    return getPost(userId, id);
}

export async function editOwnComment(userId: string, id: string, body: string) {
    const { rowCount } = await dbPool.query(
        `UPDATE community_comments SET body = $3, edited_at = now()
         WHERE id = $1 AND user_id = $2 AND NOT hidden`,
        [id, userId, body]
    );
    if ((rowCount ?? 0) === 0) return null;
    const { rows } = await dbPool.query(`${COMMENT_SELECT} WHERE c.id = $1`, [id]);
    return rows[0] ? mapComment(rows[0], userId) : null;
}

// Trending #tags from the last 30 days, and the top authors to follow (an author = an account with a pen name)
export async function sidebar(viewerId: string | null) {
    const [tags, members] = await Promise.all([
        dbPool.query(
            `SELECT lower(m[1]) AS tag, COUNT(DISTINCT p.id)::int AS posts
             FROM community_posts p, regexp_matches(p.body, '#([A-Za-z0-9_]{2,30})', 'g') AS m
             WHERE NOT p.hidden AND p.created_at > now() - interval '30 days'
             GROUP BY 1
             ORDER BY posts DESC, tag
             LIMIT 5`
        ),
        dbPool.query(
            `SELECT up.user_id AS id, trim(up.pen_name) AS name, fang_slugify(up.pen_name) AS slug,
                    up.profile_image AS avatar_url,
                    (SELECT COUNT(*)::int FROM author_follows f WHERE f.author_id = up.user_id) AS followers,
                    EXISTS (SELECT 1 FROM author_follows f WHERE f.author_id = up.user_id AND f.reader_id = $1::uuid) AS following
             FROM user_profiles up
             JOIN users u ON u.id = up.user_id
             WHERE NULLIF(trim(up.pen_name), '') IS NOT NULL
               AND COALESCE(u.role, '') NOT LIKE 'platform%'
               AND ($1::uuid IS NULL OR up.user_id <> $1::uuid)
             ORDER BY followers DESC, up.created_at DESC
             LIMIT 4`,
            [viewerId]
        ),
    ]);
    return {
        trending: tags.rows.map((r) => ({ tag: r.tag as string, posts: r.posts as number })),
        members: members.rows.map((r) => ({
            id: r.id as string,
            slug: r.slug as string,
            name: r.name as string,
            avatar_url: (r.avatar_url as string | null) ?? null,
            followers: r.followers as number,
            following: r.following as boolean,
        })),
    };
}
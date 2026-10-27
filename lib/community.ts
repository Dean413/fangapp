// lib/community.ts
// Community posts, likes, comments, follows, trending tags. Follows reuse author_follows (reader_id follows author_id).
import "server-only";
import { dbPool } from "@/lib/db";

export const POST_MAX = 2000;
export const COMMENT_MAX = 1000;
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
    avatar_url: string | null;
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
};

export type CommunityComment = {
    id: string;
    post_id: string;
    body: string;
    created_at: string;
    author: Person;
    mine: boolean;
};

type Row = Record<string, any>;

const person = (r: Row, prefix = ""): Person => ({
    id: r[`${prefix}user_id`],
    public_id: r.public_id ?? null,
    name: r.full_name || r.username || null,
    username: r.username ?? null,
    avatar_url: r.avatar_url ?? null,
});

const mapPost = (r: Row, viewerId: string | null): CommunityPost => ({
    id: r.id,
    body: r.body,
    image_url: r.image_url ?? null,
    created_at: r.created_at,
    author: person(r),
    likes: r.likes,
    comments: r.comments,
    liked: r.liked,
    mine: viewerId !== null && r.user_id === viewerId,
});

type Query = { cursor?: string | null; author?: string | null; following?: boolean; id?: string | null; limit?: number };

async function queryPosts(viewerId: string | null, q: Query) {
    const limit = q.limit ?? PAGE;
    const { rows } = await dbPool.query(
        `SELECT p.id::text, p.body, p.image_url, p.created_at, p.user_id,
                rp.public_id, rp.full_name, rp.username, rp.avatar_url,
                (SELECT COUNT(*)::int FROM community_likes l WHERE l.post_id = p.id) AS likes,
                (SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id AND NOT c.hidden) AS comments,
                EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = $1::uuid) AS liked
         FROM community_posts p
         LEFT JOIN reader_profiles rp ON rp.user_id = p.user_id
         WHERE NOT p.hidden
           AND ($2::bigint IS NULL OR p.id < $2::bigint)
           AND ($3::uuid IS NULL OR p.user_id = $3::uuid)
           AND ($4::boolean = false OR p.user_id IN (SELECT author_id FROM author_follows WHERE reader_id = $1::uuid))
           AND ($5::bigint IS NULL OR p.id = $5::bigint)
         ORDER BY p.id DESC
         LIMIT $6`,
        [viewerId, q.cursor ?? null, q.author ?? null, q.following ?? false, q.id ?? null, limit + 1]
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

export async function createPost(userId: string, body: string, imageUrl: string | null) {
    const { rows: recent } = await dbPool.query(
        `SELECT COUNT(*)::int AS n FROM community_posts WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
        [userId]
    );
    if (recent[0].n >= POSTS_PER_HOUR) return { error: "tooManyPosts" as const };
    const { rows } = await dbPool.query(
        `INSERT INTO community_posts (user_id, body, image_url) VALUES ($1, $2, $3) RETURNING id::text`,
        [userId, body, imageUrl]
    );
    return { id: rows[0].id as string };
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
    SELECT c.id::text, c.post_id::text, c.body, c.created_at, c.user_id,
           rp.public_id, rp.full_name, rp.username, rp.avatar_url
    FROM community_comments c
    LEFT JOIN reader_profiles rp ON rp.user_id = c.user_id`;

const mapComment = (r: Row, viewerId: string | null): CommunityComment => ({
    id: r.id,
    post_id: r.post_id,
    body: r.body,
    created_at: r.created_at,
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

export async function toggleFollow(viewerId: string, targetId: string) {
    const { rowCount: exists } = await dbPool.query(`SELECT 1 FROM users WHERE id = $1`, [targetId]);
    if (!exists) return null;
    const del = await dbPool.query(`DELETE FROM author_follows WHERE reader_id = $1 AND author_id = $2`, [viewerId, targetId]);
    let following = false;
    if ((del.rowCount ?? 0) === 0) {
        await dbPool.query(
            `INSERT INTO author_follows (reader_id, author_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [viewerId, targetId]
        );
        following = true;
    }
    const { rows } = await dbPool.query(`SELECT COUNT(*)::int AS n FROM author_follows WHERE author_id = $1`, [targetId]);
    return { following, followers: rows[0].n as number };
}

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
            `SELECT rp.user_id, rp.public_id, rp.full_name, rp.username, rp.avatar_url,
                    (SELECT COUNT(*)::int FROM author_follows f WHERE f.author_id = rp.user_id) AS followers,
                    EXISTS (SELECT 1 FROM author_follows f WHERE f.author_id = rp.user_id AND f.reader_id = $1::uuid) AS following
             FROM reader_profiles rp
             WHERE EXISTS (SELECT 1 FROM community_posts p WHERE p.user_id = rp.user_id AND NOT p.hidden)
               AND ($1::uuid IS NULL OR rp.user_id <> $1::uuid)
             ORDER BY followers DESC, rp.created_at DESC
             LIMIT 4`,
            [viewerId]
        ),
    ]);
    return {
        trending: tags.rows.map((r) => ({ tag: r.tag as string, posts: r.posts as number })),
        members: members.rows.map((r) => ({
            ...person(r),
            followers: r.followers as number,
            following: r.following as boolean,
        })),
    };
}
export type Vip = "weekly" | "monthly" | null;

export type Person = {
    id: string;
    public_id: string | null;
    name: string | null;
    username: string | null;
    slug: string | null;
    vip: Vip;
    avatar_url: string | null;
};

export type Poll = {
    options: { label: string; votes: number | null }[];
    total: number;
    ends_at: string;
    ended: boolean;
    my_vote: number | null;
};

export type Post = {
    id: string;
    body: string;
    image_url: string | null;
    created_at: string;
    edited: boolean;
    author: Person;
    likes: number;
    comments: number;
    liked: boolean;
    mine: boolean;
    poll: Poll | null;
};

export type Comment = { id: string; post_id: string; body: string; created_at: string; edited: boolean; author: Person; mine: boolean };
export type Member = { id: string; slug: string; name: string; avatar_url: string | null; followers: number; following: boolean };
export type Trend = { tag: string; posts: number };
export type Tab = "all" | "following";

// Updates one post in the feed
export type Change = (id: string, fn: (p: Post) => Post) => void;

export const MAX_IMAGE = 2 * 1024 * 1024;
export const POLL_DAYS = [1, 3, 7];
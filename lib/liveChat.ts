// lib/liveChat.ts
// Reader side of Live Chat (fangapp.io). The bot's topics and options live in support_topics /
// support_options; chats in support_conversations; every line in support_messages.
// Flow: topic -> option -> bot steps -> "Do you still require assistance?" (Yes / No)
//   Yes  -> status 'waiting' (staff take it from the admin Live Chat page, status 'active')
//   No   -> status 'resolved' by the bot
// A typed message goes straight to an agent. Staff resolve from the admin; the reader then rates 1-5.
// Resolved chats are never hidden: the newest one stays on screen under a "start a new chat" panel and older
// ones load on demand (getChatHistory), so the reader can scroll back through everything they have discussed.
import "server-only";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { DEFAULT_FOLLOW_UP, DEFAULT_RESOLVED_MESSAGE, DEFAULT_TOPICS } from "@/lib/liveChatScripts";

export const CHAT_TENANT = "fang";
export const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_PER_CHAT = 400;
const MAX_MESSAGES_PER_MINUTE = 15;
const TYPED_HANDOFF_MESSAGE =
    "Thank you for your message. I am transferring you to one of our live support representatives. An agent will be with you shortly.";

export type ChatStatus = "bot" | "waiting" | "active" | "resolved";
export type ChatButton = { type: "option"; id: string; label: string } | { type: "answer"; value: "yes" | "no"; label: string };
export type ChatMessage = {
    id: string;
    sender: "user" | "bot" | "staff";
    staffName: string | null;
    body: string;
    buttons: ChatButton[] | null;
    createdAt: string;
};
export type ChatConversation = {
    id: string;
    status: ChatStatus;
    topicLabel: string | null;
    rating: number | null;
    createdAt: string;
    resolvedAt: string | null;
    ratingPending: boolean; // resolved within the last day and neither rated nor skipped: show the rating pop-up
};
export type ChatTopic = { id: string; icon: string | null; label: string };
export type ChatState = { conversation: ChatConversation | null; messages: ChatMessage[] };
export type ChatHistoryItem = { conversation: ChatConversation; messages: ChatMessage[] };
export type ChatHistory = { chats: ChatHistoryItem[]; hasMore: boolean };

export class ChatError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

// ---------------------------------------------------------------
// Default scripts: copied in once, when this site has no topics yet
// ---------------------------------------------------------------
let scriptsReady = false;

export async function ensureDefaultScripts() {
    if (scriptsReady) return;
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext('support_scripts:' || $1))", [CHAT_TENANT]);
        const { rowCount } = await client.query("SELECT 1 FROM support_topics WHERE tenant = $1 LIMIT 1", [CHAT_TENANT]);
        if (!rowCount) {
            for (const [ti, topic] of DEFAULT_TOPICS.entries()) {
                const { rows } = await client.query(
                    `INSERT INTO support_topics (tenant, topic_key, label, icon, intro_message, sort_order)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [CHAT_TENANT, topic.key, topic.label, topic.icon, topic.intro, ti + 1]
                );
                for (const [oi, opt] of topic.options.entries()) {
                    await client.query(
                        `INSERT INTO support_options
                            (topic_id, label, bot_reply, follow_up, handoff_on, handoff_message, agent_greeting, resolved_message, sort_order)
                         VALUES ($1, $2, $3, $4, 'yes', $5, $6, $7, $8)`,
                        [rows[0].id, opt.label, opt.botReply, DEFAULT_FOLLOW_UP, opt.handoffMessage, opt.agentGreeting, DEFAULT_RESOLVED_MESSAGE, oi + 1]
                    );
                }
            }
        }
        await client.query("COMMIT");
        scriptsReady = true;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        throw error;
    } finally {
        client.release();
    }
}

// ---------------------------------------------------------------
// Who may chat: signed in, not banned/deleted, not suspended right now
// ---------------------------------------------------------------
export async function isSuspended(userId: string): Promise<boolean> {
    const { rows } = await db.query(
        `SELECT COALESCE(account_status, 'active') AS status, suspended_until FROM users WHERE id = $1`,
        [userId]
    );
    const row = rows[0];
    if (!row || row.status === "banned" || row.status === "deleted") throw new ChatError(401, "Please sign in to use Live Chat.");
    return row.status === "suspended" && (row.suspended_until == null || new Date(row.suspended_until) > new Date());
}

// ---------------------------------------------------------------
// Reading
// ---------------------------------------------------------------
export async function getTopics(): Promise<ChatTopic[]> {
    const { rows } = await db.query(
        `SELECT t.id, t.icon, t.label FROM support_topics t
         WHERE t.tenant = $1 AND t.is_active
           AND EXISTS (SELECT 1 FROM support_options o WHERE o.topic_id = t.id AND o.is_active)
         ORDER BY t.sort_order, t.label`,
        [CHAT_TENANT]
    );
    return rows.map((r) => ({ id: r.id, icon: r.icon, label: r.label }));
}

const CONVERSATION_COLUMNS = `
    c.id, c.status, c.rating, c.created_at, c.resolved_at, t.label AS topic_label,
    (c.status = 'resolved' AND c.rated_at IS NULL AND c.resolved_at > now() - interval '1 day') AS rating_pending`;

function toConversation(r: Record<string, unknown>): ChatConversation {
    return {
        id: String(r.id),
        status: r.status as ChatStatus,
        topicLabel: (r.topic_label as string | null) ?? null,
        rating: r.rating == null ? null : Number(r.rating),
        createdAt: new Date(r.created_at as string).toISOString(),
        resolvedAt: r.resolved_at ? new Date(r.resolved_at as string).toISOString() : null,
        ratingPending: r.rating_pending === true,
    };
}

// The chat the reader sees at the bottom: the open one, or else the newest resolved one (it stays on screen,
// under a "start a new chat" panel). Everything older is history. Shared with getChatToken so both agree.
const CURRENT_ORDER = `ORDER BY (c.status <> 'resolved') DESC, c.created_at DESC LIMIT 1`;

async function findCurrent(q: Pick<PoolClient, "query">, userId: string) {
    const { rows } = await q.query(
        `SELECT ${CONVERSATION_COLUMNS}
         FROM support_conversations c
         LEFT JOIN support_topics t ON t.id = c.topic_id
         WHERE c.tenant = $1 AND c.user_id = $2
         ${CURRENT_ORDER}`,
        [CHAT_TENANT, userId]
    );
    return rows[0] ? toConversation(rows[0]) : null;
}

async function loadMessages(q: Pick<PoolClient, "query">, conversationId: string): Promise<ChatMessage[]> {
    const { rows } = await q.query(
        `SELECT id, sender_type, staff_name, body, options, created_at
         FROM support_messages WHERE conversation_id = $1
         ORDER BY created_at, id LIMIT ${MAX_MESSAGES_PER_CHAT + 20}`,
        [conversationId]
    );
    return rows.map((r) => ({
        id: r.id,
        sender: r.sender_type,
        staffName: r.sender_type === "staff" ? r.staff_name ?? "Support" : null,
        body: r.body,
        buttons: Array.isArray(r.options) ? (r.options as ChatButton[]) : null,
        createdAt: new Date(r.created_at).toISOString(),
    }));
}

export async function getChatState(userId: string): Promise<ChatState> {
    const conversation = await findCurrent(db, userId);
    return { conversation, messages: conversation ? await loadMessages(db, conversation.id) : [] };
}

// Older resolved chats, a few at a time. `before` is the createdAt of the oldest chat already loaded.
const HISTORY_PAGE_SIZE = 3;

export async function getChatHistory(userId: string, before: string | null): Promise<ChatHistory> {
    const current = await findCurrent(db, userId);
    const cursor = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;
    const { rows } = await db.query(
        `SELECT ${CONVERSATION_COLUMNS}
         FROM support_conversations c
         LEFT JOIN support_topics t ON t.id = c.topic_id
         WHERE c.tenant = $1 AND c.user_id = $2 AND c.status = 'resolved'
           AND ($3::text IS NULL OR c.id::text <> $3)
           AND ($4::timestamptz IS NULL OR c.created_at < $4)
         ORDER BY c.created_at DESC
         LIMIT ${HISTORY_PAGE_SIZE + 1}`,
        [CHAT_TENANT, userId, current?.id ?? null, cursor]
    );
    const hasMore = rows.length > HISTORY_PAGE_SIZE;
    const page = rows.slice(0, HISTORY_PAGE_SIZE).map(toConversation);
    if (!page.length) return { chats: [], hasMore: false };

    const { rows: messageRows } = await db.query(
        `SELECT conversation_id, id, sender_type, staff_name, body, options, created_at
         FROM support_messages WHERE conversation_id = ANY($1)
         ORDER BY created_at, id`,
        [page.map((c) => c.id)]
    );
    const byChat = new Map<string, ChatMessage[]>();
    for (const r of messageRows) {
        const list = byChat.get(String(r.conversation_id)) ?? [];
        list.push({
            id: r.id,
            sender: r.sender_type,
            staffName: r.sender_type === "staff" ? r.staff_name ?? "Support" : null,
            body: r.body,
            buttons: Array.isArray(r.options) ? (r.options as ChatButton[]) : null,
            createdAt: new Date(r.created_at).toISOString(),
        });
        byChat.set(String(r.conversation_id), list);
    }
    // Pages come newest-first, but each page reads oldest-first so it can sit straight above what is already loaded
    return { chats: page.reverse().map((conversation) => ({ conversation, messages: byChat.get(conversation.id) ?? [] })), hasMore };
}

// ---------------------------------------------------------------
// Writing (each action runs in one transaction, one at a time per reader)
// ---------------------------------------------------------------
type Tx = PoolClient;

async function withReader<T>(userId: string, work: (tx: Tx) => Promise<T>): Promise<T> {
    const tx = await db.connect();
    try {
        await tx.query("BEGIN");
        await tx.query("SELECT pg_advisory_xact_lock(hashtext('support_chat:' || $1))", [userId]);
        const result = await work(tx);
        await tx.query("COMMIT");
        return result;
    } catch (error) {
        await tx.query("ROLLBACK").catch(() => { });
        throw error;
    } finally {
        tx.release();
    }
}

// Messages are spaced 1 ms apart so lines added together keep their order
async function addMessage(tx: Tx, conversationId: string, sender: "user" | "bot", body: string, buttons: ChatButton[] | null = null) {
    await tx.query(
        `INSERT INTO support_messages (conversation_id, sender_type, body, options, created_at)
         VALUES ($1, $2, $3, $4,
                 GREATEST(clock_timestamp(),
                          (SELECT MAX(created_at) + interval '1 millisecond' FROM support_messages WHERE conversation_id = $1)))`,
        [conversationId, sender, body, buttons ? JSON.stringify(buttons) : null]
    );
}

// fields is fixed SQL from this file; values go in as $2, $3...
async function touch(tx: Tx, conversationId: string, fields = "", values: unknown[] = []) {
    await tx.query(`UPDATE support_conversations SET updated_at = now()${fields ? ", " + fields : ""} WHERE id = $1`, [conversationId, ...values]);
}

async function openConversation(tx: Tx, userId: string, status: "bot" | "waiting") {
    const { rows } = await tx.query(
        `INSERT INTO support_conversations (tenant, user_id, status, handed_off_at)
         VALUES ($1, $2, $3, CASE WHEN $3 = 'waiting' THEN now() END) RETURNING id`,
        [CHAT_TENANT, userId, status]
    );
    return String(rows[0].id);
}

async function openRow(tx: Tx, userId: string) {
    const { rows } = await tx.query(
        `SELECT id, status, topic_id, option_id FROM support_conversations
         WHERE tenant = $1 AND user_id = $2 AND status IN ('bot', 'waiting', 'active')
         LIMIT 1`,
        [CHAT_TENANT, userId]
    );
    return rows[0] as { id: string; status: ChatStatus; topic_id: string | null; option_id: string | null } | undefined;
}

async function checkLimits(tx: Tx, userId: string, conversationId: string | null) {
    const { rows } = await tx.query(
        `SELECT
            (SELECT COUNT(*) FROM support_messages m JOIN support_conversations c ON c.id = m.conversation_id
              WHERE c.user_id = $1 AND m.sender_type = 'user' AND m.created_at > now() - interval '1 minute')::int AS recent,
            (SELECT COUNT(*) FROM support_messages WHERE conversation_id = $2)::int AS total`,
        [userId, conversationId]
    );
    if (rows[0].recent >= MAX_MESSAGES_PER_MINUTE) throw new ChatError(429, "You're sending messages too quickly. Please wait a moment.");
    if (rows[0].total >= MAX_MESSAGES_PER_CHAT) throw new ChatError(400, "This chat is too long. Please wait for an agent to reply.");
}

// Reader picks a topic: the bot shows that topic's options
export async function chooseTopic(userId: string, topicId: string) {
    return withReader(userId, async (tx) => {
        const { rows: topics } = await tx.query(
            `SELECT id, label, intro_message FROM support_topics WHERE id = $1 AND tenant = $2 AND is_active`,
            [topicId, CHAT_TENANT]
        );
        const topic = topics[0];
        if (!topic) throw new ChatError(404, "That topic is no longer available.");

        const { rows: options } = await tx.query(
            `SELECT id, label FROM support_options WHERE topic_id = $1 AND is_active ORDER BY sort_order, label`,
            [topicId]
        );
        if (!options.length) throw new ChatError(404, "That topic is no longer available.");

        const open = await openRow(tx, userId);
        if (open && open.status !== "bot") throw new ChatError(409, "You're already connected to our support team in this chat.");
        const conversationId = open ? open.id : await openConversation(tx, userId, "bot");
        await checkLimits(tx, userId, conversationId);

        await addMessage(tx, conversationId, "user", topic.label);
        await addMessage(
            tx, conversationId, "bot", topic.intro_message,
            options.map((o) => ({ type: "option" as const, id: String(o.id), label: String(o.label) }))
        );
        await touch(tx, conversationId, "topic_id = $2, option_id = NULL", [topic.id]);
    });
}

// Reader taps one of the topic's options: the bot shows the steps, then Yes / No
export async function chooseOption(userId: string, optionId: string) {
    return withReader(userId, async (tx) => {
        const open = await openRow(tx, userId);
        if (!open || open.status !== "bot" || !open.topic_id || open.option_id) {
            throw new ChatError(409, "Please choose a topic first.");
        }
        const { rows } = await tx.query(
            `SELECT id, label, bot_reply, follow_up FROM support_options WHERE id = $1 AND topic_id = $2 AND is_active`,
            [optionId, open.topic_id]
        );
        const option = rows[0];
        if (!option) throw new ChatError(404, "That option is no longer available.");
        await checkLimits(tx, userId, open.id);

        await addMessage(tx, open.id, "user", option.label);
        await addMessage(tx, open.id, "bot", option.bot_reply);
        await addMessage(tx, open.id, "bot", option.follow_up, [
            { type: "answer", value: "yes", label: "Yes" },
            { type: "answer", value: "no", label: "No" },
        ]);
        await touch(tx, open.id, "option_id = $2", [option.id]);
    });
}

// Reader answers "Do you still require assistance?"
export async function answerFollowUp(userId: string, answer: "yes" | "no") {
    return withReader(userId, async (tx) => {
        const open = await openRow(tx, userId);
        if (!open || open.status !== "bot" || !open.option_id) throw new ChatError(409, "There is nothing to answer right now.");

        const { rows } = await tx.query(
            `SELECT handoff_on, handoff_message, resolved_message FROM support_options WHERE id = $1`,
            [open.option_id]
        );
        const option = rows[0];
        if (!option) throw new ChatError(404, "That option is no longer available.");

        await addMessage(tx, open.id, "user", answer === "yes" ? "Yes" : "No");
        if (answer === option.handoff_on) {
            await addMessage(tx, open.id, "bot", option.handoff_message);
            await touch(tx, open.id, `status = 'waiting', handed_off_at = now()`);
        } else {
            await addMessage(tx, open.id, "bot", option.resolved_message);
            await touch(tx, open.id, `status = 'resolved', resolved_by = 'bot', resolved_at = now()`);
        }
    });
}

// Reader types a message. Before an agent has the chat, it hands the chat to an agent.
export async function sendMessage(userId: string, text: string) {
    const body = text.trim();
    if (!body) throw new ChatError(400, "Please type a message.");
    if (body.length > MAX_MESSAGE_LENGTH) throw new ChatError(400, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`);

    return withReader(userId, async (tx) => {
        const open = await openRow(tx, userId);
        const conversationId = open ? open.id : await openConversation(tx, userId, "waiting");
        await checkLimits(tx, userId, conversationId);

        await addMessage(tx, conversationId, "user", body);
        if (!open || open.status === "bot") {
            await addMessage(tx, conversationId, "bot", TYPED_HANDOFF_MESSAGE);
            await touch(tx, conversationId, `status = 'waiting', handed_off_at = COALESCE(handed_off_at, now())`);
        } else {
            await touch(tx, conversationId);
        }
    });
}

// Reader rates a resolved chat (once)
export async function rateChat(userId: string, conversationId: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ChatError(400, "Please choose 1 to 5 stars.");
    const { rowCount } = await db.query(
        `UPDATE support_conversations SET rating = $3, rated_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2 AND tenant = $4 AND status = 'resolved' AND rated_at IS NULL`,
        [conversationId, userId, rating, CHAT_TENANT]
    );
    if (!rowCount) throw new ChatError(409, "This chat can't be rated.");
}

// Reader skips the rating pop-up: the pop-up doesn't come back (no rating is saved); the chat stays in their history
export async function skipRating(userId: string, conversationId: string) {
    await db.query(
        `UPDATE support_conversations SET rated_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2 AND tenant = $3 AND status = 'resolved' AND rated_at IS NULL`,
        [conversationId, userId, CHAT_TENANT]
    );
}

// ---------------------------------------------------------------
// Change check for polling: a short text that changes whenever the reader's chat does
// (new message, new status, chat opened or closed, suspension). The page sends the one it holds;
// if it still matches, the server answers "unchanged" without loading the messages.
// ---------------------------------------------------------------
export function chatToken(chat: ChatState, suspended: boolean): string {
    const flag = suspended ? 1 : 0;
    if (!chat.conversation) return `${flag}|none`;
    const last = chat.messages[chat.messages.length - 1];
    return `${flag}|${chat.conversation.id}|${chat.conversation.status}|${last ? Date.parse(last.createdAt) : 0}`;
}

export async function getChatToken(userId: string, suspended: boolean): Promise<string> {
    const { rows } = await db.query(
        `SELECT c.id, c.status,
                (SELECT MAX(m.created_at) FROM support_messages m WHERE m.conversation_id = c.id) AS last_at
         FROM support_conversations c
         WHERE c.tenant = $1 AND c.user_id = $2
         ${CURRENT_ORDER}`,
        [CHAT_TENANT, userId]
    );
    const flag = suspended ? 1 : 0;
    const row = rows[0];
    if (!row) return `${flag}|none`;
    return `${flag}|${row.id}|${row.status}|${row.last_at ? new Date(row.last_at).getTime() : 0}`;
}
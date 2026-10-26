# Content and community features

## Catalogue (`lib/stories.ts`)

- Books are `stories` (novels) and `comics`, written in FangWriters. Only visible, non-deleted books
  distributed to `STORY_TENANT` (if set) are shown. Books owned by the platform account show no author.
- Links are `/stories/<genre-slug>/<book-slug>`. Renamed books are still found by old slugs
  (`book_slug_history`); the page redirects to the current link (`moved`).
- `listStories(filters)` — genre, status (`ongoing`/`completed`), short novels, language, sort
  (`new`, `views`, `likes`, `recommended`), exclude, limit. Exposed as `GET /api/stories`
  (client helper `lib/fetch-stories.ts`).
- `listChapters` / `getChapter` — published chapters, numbered by `chapter_number` or publish order;
  paid chapters return a preview plus the price unless the viewer has unlocked them.
- Chapter HTML (Tiptap or plain text) is sanitised server-side by `lib/chapterHtml.ts`.
- `listYouMayLike` — same writer's other books first, then same genre, in the reader's language.
- `searchStories` — title, author and tags, 2–80 characters (`GET /api/search`).
- Views (`lib/view.ts`, `POST /api/stories/[slug]/view`): one per reader (or anonymous id) per book, ever.
- Genre/tag names are translated with `metadata_option_translations` (`GET /api/option-names`,
  `hooks/useOptionName.ts`). `lib/language.ts` maps locales to stored language names
  (note: Portuguese is stored as `"Portugese"`).

## Home and rankings

- **Home** (`lib/home.ts`): rows set up by the admin in Multi-Tenant Curation (`curation_collections`,
  `curation_items`) for the tenant, platform `Websites` and the reader's language.
  `getRecommended()` builds the Recommended row from the reader's favourite genres (`GET /api/recommended`).
  Continue Reading uses `GET /api/library/continue`.
- **Rankings** (`lib/rankings.ts`): tabs are `rank_type` metadata options; each tab's pills are ranking
  lists (curation section `ranking`) with a period (`daily`, `weekly`, `monthly`, `all_round`) and
  hand-ordered books. Filters (audience male/female, novel type long/short) narrow without reordering.

## Library (`lib/library.ts`, `/api/library/*`)

Saved on the account (`reader_library`, `reading_progress`). Tabs: `reading`, `viewed`, `finished`.
The reader page reports the opened chapter (`POST /api/library/progress`); the book page asks
`GET /api/library/status` for "Continue reading". The library has a size cap (`addToLibrary` returns `FULL`).

## Authors (`lib/authors.ts`)

An author is a writer's unique pen name (`user_profiles.pen_name`); page `/authors/<pen-name-slug>`.
Follow/unfollow with `POST`/`DELETE /api/authors/[slug]/follow` (rate-limited per minute, plus a total cap);
list with `GET /api/authors/following`.

## Reviews (`lib/userActions/review.ts`)

- 0.5–5 stars (half stars) and 10–2000 characters, one per reader per book, editable.
- Eligible once the reader reached the book's halfway chapter (half its published chapters, rounded up).
  Writers can't review their own books. Admin-hidden reviews/replies aren't shown.
- The "Enjoying this book?" popup is triggered via `POST /api/reviews/prompt` at the halfway and last
  chapter, once each (`review_prompts`).
- Likes (`review_likes`) and replies (`review_replies`, max 1000 chars); a reply notifies the reviewer.

## Chapter comments (`lib/userActions/comments.ts`)

Stored in FangWriters' `comments` table with platform `'Fang'`, so writers can moderate them there.
One level of replies (replying to a reply goes under the same comment), max 1000 characters, comments the
writer blocked are hidden, the book's writer is badged as author. Likes in `comment_likes`.

Posting rules shared by reviews, replies, comments and reports (who may post, rate limits, display name
and avatar, reply notifications) live in `lib/content.ts`.

## Reports

- **Posts** (`lib/userActions/reports.ts`, `POST /api/reports`): review, review reply or comment.
  One report per reader per item, never your own, max 20 per day. Stored in `content_reports`.
- **Books** (`lib/bookReports.ts`, `POST /api/reports/book`, multipart): reason, optional original link
  and details, 1–5 evidence files (PNG/JPEG/WebP/PDF, 5 MB each, type detected from bytes). Stored in
  `book_reports` / `book_report_files`, files in S3 under `reports/books/<report id>/`. One per reader per
  book, max 5 per day, never your own book.

## Notifications (`lib/notifications.ts`)

Nothing has to push notifications: each time the reader opens notifications or the unread count is
checked, `syncNotifications()` fills in new ones from existing data:

- new chapters of books in the library (switch: New chapters)
- wallet activity: received, bought, spent, expired coins (always on)
- bonus coins expiring within 24 h and check-in ready (switch: Rewards)
- VIP started / renewed / renewal stopped / ended (always on)
- replies

Each source yields at most one notification (unique per kind + ref). Older than 90 days are cleared.
Tabs: `all`, `unread`, `mentions`, `transactions`; 20 per page. The header badge polls
`GET /api/notifications/unread` every minute.

## Profile and stats

- Reader profile (`lib/readerProfile.ts`): username `^[A-Za-z0-9_]{3,20}$`, bio ≤ 300, up to 10
  favourite genres (`reader_profiles`, `reader_favorite_genres`).
- Reading stats (`lib/readingStat.ts`, `GET /api/reading-stats?range=year|month|lastYear`): books read
  over time and by genre, reading streak (days with ≥ 60 s reading), most active day — all from
  server-measured reading time, in the reader's timezone.

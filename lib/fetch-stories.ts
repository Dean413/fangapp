import type { StoryCard } from "@/lib/stories";

// Client-side helper for GET /api/stories. Params map to the filters in lib/stories.ts.
export const fetchStories = async (params: Record<string, string | number | boolean> = {}): Promise<StoryCard[]> => {
    const query = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
    ).toString();

    const res = await fetch(`/api/stories${query ? `?${query}` : ""}`);

    if (!res.ok) {
        throw new Error("Failed to fetch stories");
    }

    return res.json();
};

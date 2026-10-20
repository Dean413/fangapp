// app/api/recommended/route.ts
// GET ?tenant=fang&language=English   the signed-in reader's Recommended row (see getRecommended in lib/home.ts).
// { books: [] } when signed out or no favorite genres picked.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommended } from "@/lib/home";

const TENANTS = ["fang", "fangnova", "fangverse", "fangink"];

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams;
    const tenant = q.get("tenant") ?? "fang";
    const language = (q.get("language") ?? "English").trim().slice(0, 40) || "English";
    const empty = () => NextResponse.json({ books: [] }, { headers: { "Cache-Control": "no-store" } });
    if (!TENANTS.includes(tenant)) return empty();

    const user = await getCurrentUser();
    if (!user) return empty();
    try {
        const books = await getRecommended(user.id, { tenant, language });
        return NextResponse.json({ books }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Recommended error:", error);
        return NextResponse.json({ message: "Couldn't load recommendations", books: [] }, { status: 500 });
    }
}
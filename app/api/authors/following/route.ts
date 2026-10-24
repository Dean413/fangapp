// app/api/authors/following/route.ts
// The signed-in reader's followed authors (for their profile).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listFollowing } from "@/lib/authors";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Please sign in first" }, { status: 401 });

    try {
        const data = await listFollowing(user.id);
        return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Following list error:", error);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { getRankingBooks, type Audience, type NovelType } from "@/lib/rankings";

// GET /api/rankings/<list id>?audience=male|female&type=long|short → the list's books in rank order
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);

        const data = await getRankingBooks(id, {
            audience: (searchParams.get("audience") as Audience) || null,
            novelType: (searchParams.get("type") as NovelType) || null,
        });

        if (!data) {
            return NextResponse.json({ message: "Ranking not found" }, { status: 404 });
        }
        return NextResponse.json({ data });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Failed to fetch ranking" }, { status: 500 });
    }
}
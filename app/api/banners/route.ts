// GET: the banners readers should see, newest first (the images are public links in the bucket)
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

const MAX_BANNERS = 10;

export async function GET() {
    try {
        const { rows } = await dbPool.query(
            `SELECT id, desktop_url, mobile_url, link_url FROM site_banners
             WHERE audience IN ('readers', 'both')
             ORDER BY created_at DESC LIMIT $1`,
            [MAX_BANNERS]
        );
        return NextResponse.json(
            {
                banners: rows.map((r) => ({
                    id: r.id as string,
                    desktop: r.desktop_url as string,
                    mobile: r.mobile_url as string,
                    link: (r.link_url as string | null) ?? null,
                })),
            },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
        );
    } catch (error) {
        console.error("Banners list error:", error);
        return NextResponse.json({ banners: [] }, { status: 500 });
    }
}
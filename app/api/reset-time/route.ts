import { NextResponse } from "next/server";

declare global {
    var readingTime: number | undefined;
}
export async function POST() {
    global.readingTime = 0;
    return NextResponse.json({
        success: true,
        totalSeconds: 0
    });


}
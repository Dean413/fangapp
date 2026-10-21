// app/api/auth/logout/route.ts
// Signs out on this browser: both login cookies are removed on the response itself.
import { NextResponse } from "next/server";
import { translateMsg } from "@/lib/i18n";

const COOKIES = ["fang_access", "fang_refresh"];

export async function POST() {
    const response = NextResponse.json({ message: await translateMsg("signedOut") }, { status: 200 });
    for (const name of COOKIES) {
        response.cookies.set(name, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
}
// app/api/settings/delete/code/route.ts
// For accounts without a password (Google / Facebook): emails a code to confirm deleting the account
import { getCurrentUser } from "@/lib/auth/session";
import { issueCode, waitMessage } from "@/lib/auth/emailCode";
import { sendCodeEmail } from "@/lib/auth/email";
import { reply } from "@/lib/auth/rules";

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    try {
        const issued = await issueCode(user.id, "delete_account");
        if (!("code" in issued)) return reply(429, waitMessage(issued.waitSeconds), { code: "WAIT", waitSeconds: issued.waitSeconds });
        await sendCodeEmail("delete_account", user.email, issued.code);
        return reply(200, "We've sent a code to your email");
    } catch (error) {
        console.error("Delete code error:", error);
        return reply(500, "Couldn't send the code. Please try again.");
    }
}
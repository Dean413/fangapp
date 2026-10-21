// app/api/rewards/reading/heartbeat/route.ts
// "Still reading" signal from the reading page (signed-in readers). The server counts the time itself.
// At 30 minutes in a period the reading gem is added by itself; the answer then carries the new wallet.
import { getCurrentUser } from "@/lib/auth/session";
import { grantReadingGem, READING_GEM, recordReadingBeat } from "@/lib/readingReward";
import { getWalletBalance } from "@/lib/wallet";
import { reply } from "@/lib/auth/rules";

export async function POST() {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    try {
        const seconds = await recordReadingBeat(user.id);

        // The gem never blocks the reading signal if something goes wrong
        let gem = false;
        if (seconds >= READING_GEM.minutes * 60) {
            try {
                gem = await grantReadingGem(user.id);
            } catch (error) {
                console.error("Reading gem error:", error);
            }
        }

        return reply(200, "OK", {
            seconds,
            gem: gem ? READING_GEM.gems : 0,
            wallet: gem ? await getWalletBalance(user.id) : undefined,
        });
    } catch (error) {
        console.error("Reading signal error:", error);
        return reply(500, "somethingWrong");
    }
}
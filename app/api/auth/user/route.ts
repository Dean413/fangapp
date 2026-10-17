// app/api/auth/user/route.ts
// The signed-in reader: account, reader profile and wallet, or 401 when signed out
import { getCurrentUser } from "@/lib/auth/session";
import { prepareReader } from "@/lib/auth/account";
import { getReaderProfile } from "@/lib/readerProfile";
import { getWalletBalance } from "@/lib/wallet";
import { reply } from "@/lib/auth/rules";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return reply(401, "Not signed in", { user: null });

        let profile = await getReaderProfile(user.id);
        if (!profile) {
            // Signed in before reader profiles existed: make it now
            await prepareReader(user.id);
            profile = await getReaderProfile(user.id);
        }
        const wallet = await getWalletBalance(user.id);

        return reply(200, "OK", {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: profile?.full_name ?? "",
                public_id: profile?.public_id ?? null,
                username: profile?.username ?? null,
                bio: profile?.bio ?? null,
                avatar_url: profile?.avatar_url ?? null,
                cover_url: profile?.cover_url ?? null,
                genre_ids: profile?.genre_ids ?? [],
                joined_at: profile?.joined_at ?? null,
                wallet,
            },
        });
    } catch (error) {
        console.error("Current user error:", error);
        return reply(500, "Something went wrong", { user: null });
    }
}
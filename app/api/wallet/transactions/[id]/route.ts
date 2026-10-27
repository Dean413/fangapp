// app/api/wallet/transactions/[id]/route.ts
// One entry of the signed-in reader's wallet history (never anyone else's)
import { getCurrentUser } from "@/lib/auth/session";
import { getTransaction } from "@/lib/transaction";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const { id } = await params;
    try {
        const transaction = await getTransaction(user.id, id);
        if (!transaction) return reply(404, "transactionNotFound");
        return reply(200, "OK", { transaction });
    } catch (error) {
        logError("Transaction error:", error);
        return reply(500, "couldntLoadTransaction");
    }
}
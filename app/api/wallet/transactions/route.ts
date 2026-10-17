// app/api/wallet/transactions/route.ts
// The signed-in reader's wallet history: ?filter=all|earned|spent|expired&before=<last id of the previous page>
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { TX_FILTERS, listTransactions, type TxFilter } from "@/lib/transaction";
import { reply } from "@/lib/auth/rules";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");

    const asked = request.nextUrl.searchParams.get("filter") as TxFilter | null;
    const filter: TxFilter = asked && TX_FILTERS.includes(asked) ? asked : "all";
    const before = request.nextUrl.searchParams.get("before");
    try {
        return reply(200, "OK", { filter, ...(await listTransactions(user.id, filter, before)) });
    } catch (error) {
        console.error("Transactions error:", error);
        return reply(500, "Couldn't load your transactions. Please try again.");
    }
}
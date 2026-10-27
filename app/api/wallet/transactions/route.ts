// app/api/wallet/transactions/route.ts
// The signed-in reader's wallet history:
//   ?filter=all|topup|earned|spent|expired  &from=YYYY-MM-DD  &to=YYYY-MM-DD  &before=<last id of the previous page>
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { TX_FILTERS, cleanDay, listTransactions, type TxFilter } from "@/lib/transaction";
import { reply } from "@/lib/auth/rules";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const params = request.nextUrl.searchParams;
    const asked = params.get("filter") as TxFilter | null;
    const filter: TxFilter = asked && TX_FILTERS.includes(asked) ? asked : "all";
    const before = params.get("before");
    const from = cleanDay(params.get("from"));
    const to = cleanDay(params.get("to"));
    if (from && to && from > to) return reply(400, "invalidDateRange");

    try {
        return reply(200, "OK", { filter, ...(await listTransactions(user.id, filter, before, { from, to })) });
    } catch (error) {
        logError("Transactions error:", error);
        return reply(500, "couldntLoadTransactions");
    }
}
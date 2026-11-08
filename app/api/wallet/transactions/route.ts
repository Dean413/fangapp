// app/api/wallet/transactions/route.ts
// The signed-in reader's wallet history:
//   GET    ?filter=all|topup|earned|spent|expired  &from=YYYY-MM-DD  &to=YYYY-MM-DD  &before=<last id of the previous page>
//   DELETE { ids: [...] }                                   delete those entries from their history
//          { all: true, filter, from, to }                  delete everything matching what they are looking at
// Deleting only hides entries from the reader (soft delete): nothing in the ledger changes and the admin still sees everything.
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { TX_FILTERS, cleanDay, hideAllTransactions, hideTransactions, listTransactions, type TxFilter } from "@/lib/transaction";
import { readJson, reply } from "@/lib/auth/rules";
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
        return reply(500, "couldntLoadTransactions", { debug: String(error) });
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");

    const body = await readJson(request);
    if (!body) return reply(400, "invalidRequest");

    try {
        if (body.all === true) {
            const asked = body.filter as TxFilter;
            const filter: TxFilter = TX_FILTERS.includes(asked) ? asked : "all";
            const from = cleanDay(body.from);
            const to = cleanDay(body.to);
            if (from && to && from > to) return reply(400, "invalidDateRange");
            return reply(200, "OK", { count: await hideAllTransactions(user.id, filter, { from, to }) });
        }

        const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
        if (ids.length === 0) return reply(400, "invalidRequest");
        return reply(200, "OK", { count: await hideTransactions(user.id, ids) });
    } catch (error) {
        logError("Delete transactions error:", error);
        return reply(500, "couldntDeleteTransactions");
    }
}
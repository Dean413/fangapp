import { getCurrentUser } from "@/lib/auth/session";
import { deleteReply } from "@/lib/userActions/review";
import { reply } from "@/lib/auth/rules";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    try {
        if (!(await deleteReply(user.id, id))) return reply(404, "replyNotFound");
        return reply(200, "replyDeleted");
    } catch (error) {
        console.error("Reply delete error:", error);
        return reply(500, "couldntDeleteReply");
    }
}
import { getCurrentUser } from "@/lib/auth/session";
import { deleteReply } from "@/lib/userActions/review";
import { reply } from "@/lib/auth/rules";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    const { id } = await params;
    try {
        if (!(await deleteReply(user.id, id))) return reply(404, "Reply not found");
        return reply(200, "Reply deleted");
    } catch (error) {
        console.error("Reply delete error:", error);
        return reply(500, "Couldn't delete your reply. Please try again.");
    }
}
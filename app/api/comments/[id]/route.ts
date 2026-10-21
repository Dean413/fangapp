// app/api/comments/[id]/route.ts
// DELETE   delete the signed-in reader's own comment (its replies go with it)
import { getCurrentUser } from "@/lib/auth/session";
import { deleteComment } from "@/lib/userActions/comments";
import { reply } from "@/lib/auth/rules";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "signInFirst");
    const { id } = await params;
    try {
        if (!(await deleteComment(user.id, id))) return reply(404, "commentNotFound");
        return reply(200, "commentDeleted");
    } catch (error) {
        console.error("Comment delete error:", error);
        return reply(500, "couldntDeleteComment");
    }
}
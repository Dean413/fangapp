// app/api/reviews/[id]/route.ts
// DELETE   delete the signed-in reader's own review
import { getCurrentUser } from "@/lib/auth/session";
import { deleteReview } from "@/lib/userActions/review";
import { reply } from "@/lib/auth/rules";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return reply(401, "Please sign in first");
    const { id } = await params;
    try {
        if (!(await deleteReview(user.id, id))) return reply(404, "Review not found");
        return reply(200, "Review deleted");
    } catch (error) {
        console.error("Review delete error:", error);
        return reply(500, "Couldn't delete your review. Please try again.");
    }
}
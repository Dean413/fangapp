import { redirect } from "next/navigation";

// Genres are picked on /stories now; old genre links open it with that genre selected
export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
    const { genre } = await params;
    redirect(`/stories?genre=${encodeURIComponent(genre)}`);
}
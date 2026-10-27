"use client";
import type { ReactNode } from "react";
import Image from "next/image";
import { Avatar } from "@/components/reviews/stars";
import { Link } from "@/i18n/routing";
import type { Person } from "@/lib/community";

// Links to the author's page when the poster is an author; plain otherwise
export function AuthorLink({ slug, className = "", children }: { slug: string | null; className?: string; children: ReactNode }) {
    if (!slug) return <div className={className}>{children}</div>;
    return <Link href={`/authors/${slug}`} className={`${className} group`}>{children}</Link>;
}

// The picture; VIP members get their plan's crown at the bottom-right (same as the navbar)
export function PostAvatar({ person, name, size }: { person: Pick<Person, "avatar_url" | "vip">; name: string; size: number }) {
    const crown = size >= 36 ? 16 : 12;
    return (
        <span className="relative inline-flex shrink-0">
            <Avatar src={person.avatar_url} name={name} size={size} />
            {person.vip && (
                <Image src={`/fang_pictures/${person.vip}-vip-crown.png`} alt="" aria-hidden="true" width={crown} height={crown}
                    style={{ width: crown, height: crown }}
                    className="pointer-events-none absolute -bottom-1 -right-1 object-contain drop-shadow" />
            )}
        </span>
    );
}
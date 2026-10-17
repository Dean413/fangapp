export type UserRole = 'reader' | 'writer' | 'admin' | string;

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deleted';

// public.users
export interface User {
    id: string;
    email: string;
    password_hash: string | null;
    role: UserRole;
    account_status: AccountStatus;
    created_at: Date;
    last_active_at: Date | null;
    announcements_seen_at: Date | null;
}

// public.user_profiles (reader-facing columns)
export interface UserProfile {
    id: string;
    user_id: string;
    public_id: string;
    full_name: string;
    pen_name: string;
    email: string;
    profile_image: string | null;
    created_at: Date;
    updated_at: Date;
}

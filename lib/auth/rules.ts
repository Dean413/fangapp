// lib/auth/rules.ts
// Input checks shared by the auth routes, and the reply format the reader app's hooks expect ({ message, code })
import "server-only";
import { NextResponse } from "next/server";

export const reply = (status: number, message: string, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ message, ...extra }, { status });

export const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const isEmail = (email: string) => email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Same rule as the sign-up form: at least 10 characters with letters and numbers
export function newPasswordProblem(password: unknown): string | null {
    if (typeof password !== "string") return "Password is required";
    if (password.length < 10) return "Password must be at least 10 characters";
    if (password.length > 128) return "Password must be at most 128 characters";
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Password must contain letters and numbers";
    return null;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}
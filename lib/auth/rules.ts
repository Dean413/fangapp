// lib/auth/rules.ts
// Input checks shared by the auth routes, and the reply format the reader app's hooks expect ({ message, code })
import "server-only";
import { NextResponse } from "next/server";
import { translateMsg, type Msg } from "@/lib/i18n";

// `message` is a key in the "Api" messages, translated into the reader's language
export const reply = async (status: number, message: Msg, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ message: await translateMsg(message), ...extra }, { status });

export const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const isEmail = (email: string) => email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Same rule as the sign-up form: at least 10 characters with letters and numbers
export function newPasswordProblem(password: unknown): string | null {
    if (typeof password !== "string") return "passwordRequired";
    if (password.length < 10) return "passwordTooShort";
    if (password.length > 128) return "passwordTooLong";
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "passwordLettersNumbers";
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

"use client";

// The popups used by the settings page: change password, change email, two-factor, delete account,
// notification preferences. Same card style as the sign-in cards.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/Button";
import Input from "@/components/input";
import PasswordInput from "@/components/passwordInput";
import OTPInput from "@/components/otp";
import ToggleSwitch from "./toggle-switch";

export type NotificationSettings = { newChapters: boolean; rewards: boolean; replies: boolean; emailUpdates: boolean };

async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

function Dialog({ open, onClose, title, text, busy, children }: {
    open: boolean;
    onClose: () => void;
    title: string;
    text?: string;
    busy?: boolean;
    children: React.ReactNode;
}) {
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "auto";
        return () => { document.body.style.overflow = "auto"; };
    }, [open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-full max-w-128.75 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl no-scrollbar animate-in fade-in zoom-in duration-300">
                <button type="button" onClick={onClose} disabled={busy} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                    <X size={18} />
                </button>
                <div className="w-full px-6 md:px-16 sm:px-6 py-5 sm:py-6">
                    <div className="mb-4 sm:mb-6 pr-8">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{title}</h2>
                        {text && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{text}</p>}
                    </div>
                    <div className="space-y-4 sm:space-y-5">{children}</div>
                </div>
            </div>
        </div>
    );
}

// Blocks a second click before the page has re-drawn
function useBusy() {
    const ref = useRef(false);
    const [busy, setBusy] = useState(false);
    const run = async (fn: () => Promise<void>) => {
        if (ref.current) return;
        ref.current = true;
        setBusy(true);
        try {
            await fn();
        } catch {
            toast.error("Unable to reach the server. Please try again.");
        } finally {
            ref.current = false;
            setBusy(false);
        }
    };
    return { busy, run };
}

const passwordProblem = (p: string) =>
    p.length < 10 || !/[a-zA-Z]/.test(p) || !/[0-9]/.test(p) ? "Password must be at least 10 characters with letters and numbers" : null;

// ---------- Password ----------

export function ChangePasswordDialog({ open, onClose, hasPassword, onDone }: {
    open: boolean; onClose: () => void; hasPassword: boolean; onDone: () => void;
}) {
    const [current, setCurrent] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState({ current: false, password: false, confirm: false });
    const { busy, run } = useBusy();

    useEffect(() => {
        if (!open) { setCurrent(""); setPassword(""); setConfirm(""); }
    }, [open]);

    const save = () => run(async () => {
        if (hasPassword && !current) return void toast.error("Enter your current password");
        const problem = passwordProblem(password);
        if (problem) return void toast.error(problem);
        if (password !== confirm) return void toast.error("Passwords don't match");
        const { ok, data } = await send("/api/settings/password", "POST", { current, password });
        if (!ok) return void toast.error(data.message || "Couldn't change your password");
        toast.success(data.message || "Password changed");
        onDone();
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} busy={busy}
            title={hasPassword ? "Change Password" : "Set a Password"}
            text={hasPassword ? "Other devices will be signed out." : "Add a password so you can also sign in with your email."}>
            {hasPassword && (
                <PasswordInput value={current} onChange={setCurrent} show={show.current} setShow={(v) => setShow((s) => ({ ...s, current: v }))}
                    showStrengthBar={false} label="Current password" placeholder="Enter current password" />
            )}
            <PasswordInput value={password} onChange={setPassword} show={show.password} setShow={(v) => setShow((s) => ({ ...s, password: v }))}
                showStrengthBar={false} label="New password" placeholder="Enter new password" />
            <PasswordInput value={confirm} onChange={setConfirm} show={show.confirm} setShow={(v) => setShow((s) => ({ ...s, confirm: v }))}
                showStrengthBar={false} label="Confirm password" placeholder="Confirm password" />
            <Button onClick={save} disabled={busy || !password || !confirm} loading={busy} loadingText="Saving..." label={hasPassword ? "Change password" : "Set password"} />
        </Dialog>
    );
}

// ---------- Email ----------

export function ChangeEmailDialog({ open, onClose, hasPassword, onDone }: {
    open: boolean; onClose: () => void; hasPassword: boolean; onDone: (email: string) => void;
}) {
    const [step, setStep] = useState<1 | 2>(1);
    const [newEmail, setNewEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const { busy, run } = useBusy();
    const lastAutoCode = useRef("");

    useEffect(() => {
        if (!open) { setStep(1); setNewEmail(""); setPassword(""); setOtp(""); setOtpMessage(""); }
    }, [open]);

    const sendCode = () => run(async () => {
        if (!newEmail.trim()) return void toast.error("Enter your new email");
        if (hasPassword && !password) return void toast.error("Enter your password");
        const { ok, data } = await send("/api/settings/email", "POST", { newEmail, password });
        if (!ok) return void toast.error(data.message || "Couldn't send the code");
        toast.success(data.message || "Code sent");
        setOtp("");
        setOtpMessage("");
        setStep(2);
    });

    const resend = () => run(async () => {
        setOtp("");
        const { ok, data } = await send("/api/settings/email", "POST", { newEmail, password });
        setOtpMessage(ok ? "New code sent" : data.message || "Could not resend the code");
    });

    const confirmCode = () => run(async () => {
        if (otp.length !== 6) return;
        const { ok, data } = await send("/api/settings/email/confirm", "POST", { code: otp });
        if (!ok) return void setOtpMessage(data.message || "That code is incorrect");
        toast.success(data.message || "Email changed");
        onDone(data.email);
        onClose();
    });

    // Confirm by itself once all 6 digits are in
    useEffect(() => {
        if (step !== 2 || otp.length < 6) { lastAutoCode.current = ""; return; }
        if (busy || otp === lastAutoCode.current) return;
        lastAutoCode.current = otp;
        confirmCode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp, step, busy]);

    return (
        <Dialog open={open} onClose={onClose} busy={busy} title="Change Email"
            text={step === 1 ? "We'll send a code to your new email to confirm it." : `Enter the 6 digit code we sent to ${newEmail.trim().toLowerCase()}.`}>
            {step === 1 ? (
                <>
                    <Input label="New email" value={newEmail} onChange={setNewEmail} />
                    {hasPassword && (
                        <PasswordInput value={password} onChange={setPassword} show={show} setShow={setShow}
                            showStrengthBar={false} label="Password" placeholder="Enter your password" />
                    )}
                    <Button onClick={sendCode} disabled={busy || !newEmail.trim()} loading={busy} loadingText="Sending..." label="Send code" />
                </>
            ) : (
                <>
                    <OTPInput length={6} onChange={setOtp} value={otp} resend={resend} errorMessage={otpMessage} />
                    <Button onClick={confirmCode} disabled={busy || otp.length !== 6} loading={busy} loadingText="Verifying..." label="Change email" />
                </>
            )}
        </Dialog>
    );
}

// ---------- Two-factor ----------

export function TwoFactorDialog({ open, onClose, enable, onDone }: {
    open: boolean; onClose: () => void; enable: boolean; onDone: (enabled: boolean) => void;
}) {
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const { busy, run } = useBusy();

    useEffect(() => { if (!open) setPassword(""); }, [open]);

    const save = () => run(async () => {
        if (!password) return void toast.error("Enter your password");
        const { ok, data } = await send("/api/settings/two-factor", "POST", { enabled: enable, password });
        if (!ok) return void toast.error(data.message || "Couldn't change two-factor sign-in");
        toast.success(data.message);
        onDone(enable);
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} busy={busy}
            title={enable ? "Turn On Two-Factor" : "Turn Off Two-Factor"}
            text={enable
                ? "When you sign in with your password, we'll also email you a 6 digit code."
                : "You'll sign in with just your password."}>
            <PasswordInput value={password} onChange={setPassword} show={show} setShow={setShow}
                showStrengthBar={false} label="Password" placeholder="Enter your password" />
            <Button onClick={save} disabled={busy || !password} loading={busy} loadingText="Saving..." label={enable ? "Turn on" : "Turn off"} />
        </Dialog>
    );
}

// ---------- Delete ----------

export function DeleteAccountDialog({ open, onClose, hasPassword, isWriter, onDone }: {
    open: boolean; onClose: () => void; hasPassword: boolean; isWriter: boolean; onDone: () => void;
}) {
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const { busy, run } = useBusy();

    useEffect(() => {
        if (!open) { setPassword(""); setCodeSent(false); setOtp(""); setOtpMessage(""); }
    }, [open]);

    const sendCode = () => run(async () => {
        setOtp("");
        const { ok, data } = await send("/api/settings/delete/code", "POST");
        if (!ok) {
            if (codeSent) setOtpMessage(data.message || "Could not send the code");
            else toast.error(data.message || "Couldn't send the code");
            return;
        }
        if (codeSent) setOtpMessage("New code sent");
        else toast.success(data.message || "Code sent");
        setCodeSent(true);
    });

    const remove = () => run(async () => {
        const body = hasPassword ? { password } : { code: otp };
        const { ok, data } = await send("/api/settings/delete", "POST", body);
        if (!ok) {
            if (!hasPassword) setOtpMessage(data.message || "That code is incorrect");
            else toast.error(data.message || "Couldn't delete your account");
            return;
        }
        toast.success(data.message || "Your account has been deleted");
        onDone();
    });

    const ready = hasPassword ? Boolean(password) : codeSent && otp.length === 6;

    return (
        <Dialog open={open} onClose={onClose} busy={busy} title="Delete Account"
            text="Your profile, library and reading history will be removed and you won't be able to sign in again. Unused coins are lost. This can't be undone.">
            {isWriter ? (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    This account is also your FangWriters account, so it can&apos;t be deleted here. Contact support@fangwriters.com.
                </p>
            ) : hasPassword ? (
                <>
                    <PasswordInput value={password} onChange={setPassword} show={show} setShow={setShow}
                        showStrengthBar={false} label="Password" placeholder="Enter your password" />
                    <button type="button" onClick={remove} disabled={busy || !ready}
                        className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50">
                        {busy ? "Deleting..." : "Delete my account"}
                    </button>
                </>
            ) : !codeSent ? (
                <Button onClick={sendCode} disabled={busy} loading={busy} loadingText="Sending..." label="Email me a code" />
            ) : (
                <>
                    <OTPInput length={6} onChange={setOtp} value={otp} resend={sendCode} errorMessage={otpMessage} />
                    <button type="button" onClick={remove} disabled={busy || !ready}
                        className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50">
                        {busy ? "Deleting..." : "Delete my account"}
                    </button>
                </>
            )}
        </Dialog>
    );
}

// ---------- Notifications ----------

const NOTIFICATION_ROWS: { key: keyof NotificationSettings; title: string; text: string }[] = [
    { key: "newChapters", title: "New chapters", text: "When a book in your library gets a new chapter" },
    { key: "rewards", title: "Rewards", text: "Check-in reminders and bonus coins about to expire" },
    { key: "replies", title: "Replies", text: "When someone replies to your comment" },
    { key: "emailUpdates", title: "Email updates", text: "News and recommendations by email" },
];

export function NotificationsDialog({ open, onClose, value, onDone }: {
    open: boolean; onClose: () => void; value: NotificationSettings; onDone: (n: NotificationSettings) => void;
}) {
    const [draft, setDraft] = useState<NotificationSettings>(value);
    const { busy, run } = useBusy();

    useEffect(() => { if (open) setDraft(value); }, [open, value]);

    const save = () => run(async () => {
        const { ok, data } = await send("/api/settings/notifications", "PUT", draft);
        if (!ok) return void toast.error(data.message || "Couldn't save");
        toast.success(data.message || "Saved");
        onDone(draft);
        onClose();
    });

    return (
        <Dialog open={open} onClose={onClose} busy={busy} title="Notification Preferences" text="Choose what alerts you receive.">
            <div>
                {NOTIFICATION_ROWS.map((row) => (
                    <div key={row.key} className="flex justify-between items-center py-3 border-b border-b-gray-200 last:border-none gap-4">
                        <div>
                            <p className="font-semibold">{row.title}</p>
                            <p className="text-sm text-gray-500 dark:text-neutral-400">{row.text}</p>
                        </div>
                        <ToggleSwitch enabled={draft[row.key]} onChange={() => setDraft((d) => ({ ...d, [row.key]: !d[row.key] }))} />
                    </div>
                ))}
            </div>
            <Button onClick={save} disabled={busy} loading={busy} loadingText="Saving..." label="Save" />
        </Dialog>
    );
}
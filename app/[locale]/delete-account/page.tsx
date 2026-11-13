// app/[locale]/delete-account/page.tsx  (same parent folder as your privacy-policy page)
export const metadata = {
    title: "Delete your Fang account",
    description: "How to delete your Fang account and what happens to your data.",
};

export default function DeleteAccountPage() {
    return (
        <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold">Delete your Fang account</h1>
            <p>
                This page explains how to delete your Fang account and the data linked to it. It applies to the
                Fang app and to fangapp.io.
            </p>

            <section className="space-y-2">
                <h2 className="text-xl font-semibold">How to delete your account</h2>
                <ol className="list-decimal pl-6 space-y-1">
                    <li>Log in to your Fang account in the app or on fangapp.io.</li>
                    <li>Open Settings, then go to Security and log in and then choose Delete account.</li>
                    <li>
                        Confirm with your password. If your account has no password (for example you signed up with
                        Google, Facebook or Apple), we email you a confirmation code to enter instead.
                    </li>
                </ol>
                <p>
                    If you can't log in, email support@fangapp.io from the address on your account with the subject
                    "Delete my Fang account", and we will handle it within 7days
                </p>
            </section>
        </main>
    );
}
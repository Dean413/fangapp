export const JSON_HEADERS = { "Content-Type": "application/json" };

// fetch that never throws: { ok, data } with the API's message when it fails
export async function call<D>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: Partial<D> & { message?: string } }> {
    try {
        const res = await fetch(url, init);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
    } catch {
        return { ok: false, data: {} };
    }
}
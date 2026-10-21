import { create } from "zustand";
import { useAuthStore } from "./authStore";
import { useAuthModals } from "./auth-card-store";
import { toast } from "./toastStore";
import { tc } from "@/lib/i18n-client";

// The library is saved on the account (see /api/library), not in this browser.
// Books are named by their link id (the story slug), like the rest of the app.

export type LibraryTab = "reading" | "viewed" | "finished";

type Book = {
    id: string;
    title: string;
    image: string;
    storyId?: string;
    saved?: boolean;
    lastChapter?: number | null;
    chapterCount?: number;
    finished?: boolean;
    href?: string;
};

type SavedId = { id: string; storyId: string };

type LibraryStore = {
    library: Book[];          // the books on the open tab
    saved: SavedId[];         // every saved book (for isSaved)
    tab: LibraryTab;
    loading: boolean;
    loaded: boolean;
    selected: string[];
    isEditMode: boolean;

    setTab: (tab: LibraryTab) => void;
    fetchLibrary: (tab?: LibraryTab) => Promise<void>;
    reset: () => void;

    toggleBook: (book: Book) => Promise<void>;
    isSaved: (id: string) => boolean;

    setEditMode: (value: boolean) => void;

    toggleSelect: (id: string) => void;
    clearSelection: () => void;
    removeSelected: () => Promise<void>;
};

// The library this browser kept before it moved to the account
const OLD_LOCAL_KEY = "library-storage";

function readOldLocalIds(): string[] {
    try {
        const raw = localStorage.getItem(OLD_LOCAL_KEY);
        if (!raw) return [];
        const books = JSON.parse(raw)?.state?.library;
        return Array.isArray(books) ? books.map((b: { id?: unknown }) => b?.id).filter((id): id is string => typeof id === "string") : [];
    } catch {
        return [];
    }
}

function clearOldLocal() {
    try {
        localStorage.removeItem(OLD_LOCAL_KEY);
    } catch {
        // nothing to do
    }
}

let importing = false;
const pending = new Set<string>();   // books being saved / removed (one request at a time per book)
let removing = false;

export const useLibraryStore = create<LibraryStore>()((set, get) => ({
    library: [],
    saved: [],
    tab: "reading",
    loading: false,
    loaded: false,
    selected: [],
    isEditMode: false,

    setTab: (tab) => {
        set({ tab, selected: [], isEditMode: false });
        get().fetchLibrary(tab);
    },

    fetchLibrary: async (tab) => {
        const wanted = tab ?? get().tab;
        set({ loading: true });
        try {
            // First time on this account: move a library saved in this browser into it (once)
            const oldIds = readOldLocalIds();
            if (oldIds.length > 0 && !importing) {
                importing = true;
                try {
                    const res = await fetch("/api/library/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ ids: oldIds }),
                    });
                    if (res.ok) clearOldLocal();
                } finally {
                    importing = false;
                }
            }

            const res = await fetch(`/api/library?tab=${wanted}`, { credentials: "include", cache: "no-store" });
            if (!res.ok) {
                if (res.status === 401) set({ library: [], saved: [] });
                return;
            }
            const data = await res.json();
            // Ignore an answer for a tab the reader has already left
            if (get().tab !== wanted) return;
            set({
                library: Array.isArray(data.books) ? data.books : [],
                saved: Array.isArray(data.saved) ? data.saved : [],
                loaded: true,
            });
        } catch {
            // keep what's shown
        } finally {
            set({ loading: false });
        }
    },

    reset: () => set({ library: [], saved: [], loaded: false, selected: [], isEditMode: false, tab: "reading" }),

    // 📚 ADD / REMOVE BOOK
    toggleBook: async (book) => {
        if (!useAuthStore.getState().user) {
            toast.info(tc("Library.signInToSave"));
            useAuthModals.getState().openSignIn();
            return;
        }
        if (pending.has(book.id)) return;
        pending.add(book.id);

        const wasSaved = get().isSaved(book.id);
        const before = get().saved;
        // Show the change straight away; put it back if the server says no
        set({
            saved: wasSaved
                ? before.filter((b) => b.id !== book.id && b.storyId !== book.id)
                : [...before, { id: book.id, storyId: book.storyId ?? book.id }],
        });

        try {
            const res = await fetch("/api/library", {
                method: wasSaved ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(wasSaved ? { ids: [book.id], from: "library" } : { id: book.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                set({ saved: before });
                toast.error(data.message || tc("Library.couldntUpdate"));
                return;
            }
            if (Array.isArray(data.saved)) set({ saved: data.saved });
            toast.success(wasSaved ? tc("Library.removedFromLibrary") : tc("Library.addedToLibrary"));
            if (get().loaded && get().tab === "reading") get().fetchLibrary("reading");
        } catch {
            set({ saved: before });
            toast.error(tc("Common.networkError"));
        } finally {
            pending.delete(book.id);
        }
    },

    // ❤️ CHECK IF SAVED (USED IN READER)
    isSaved: (id) => get().saved.some((b) => b.id === id || b.storyId === id),

    // ✏️ EDIT MODE TOGGLE
    setEditMode: (value) => {
        set({ isEditMode: value });
        if (!value) set({ selected: [] });
    },

    // 🎯 SELECT ITEMS
    toggleSelect: (id) => {
        const selected = get().selected;
        set({
            selected: selected.includes(id)
                ? selected.filter((item) => item !== id)
                : [...selected, id],
        });
    },

    // 🧹 CLEAR SELECTION
    clearSelection: () => set({ selected: [] }),

    // 🗑 REMOVE SELECTED BOOKS (from the library on Reading; from the reading history on Viewed / Finished)
    removeSelected: async () => {
        const selected = get().selected;
        if (selected.length === 0 || removing) return;
        removing = true;
        const from = get().tab === "reading" ? "library" : "history";
        const before = get().library;
        set({ library: before.filter((b) => !selected.includes(b.id)), selected: [], isEditMode: false });
        try {
            const res = await fetch("/api/library", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ids: selected, from }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                set({ library: before });
                toast.error(data.message || tc("Library.couldntRemove"));
                return;
            }
            if (Array.isArray(data.saved)) set({ saved: data.saved });
            toast.success(data.message || tc("Library.removed"));
        } catch {
            set({ library: before });
            toast.error(tc("Common.networkError"));
        } finally {
            removing = false;
        }
    },
}));
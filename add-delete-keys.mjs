// add-notification-keys.mjs
// Adds the new texts for deleting notifications to messages/<language>.json.
// Run it once from the reader project folder:   node add-notification-keys.mjs
// It only inserts new lines (nothing else in the files changes) and skips any text that is already there.
import fs from "node:fs";

const T = {
    en: {
        select: "Select", selectAll: "Select all", deselectAll: "Deselect all", selectedCount: "{count} selected",
        deleteSelected: "Delete selected", deleteAll: "Delete all",
        deleteTitleSelected: "Delete selected notifications?", deleteTitleAll_all: "Delete all notifications?",
        deleteTitleAll_unread: "Delete all unread notifications?", deleteTitleAll_mentions: "Delete all mentions?",
        deleteText: "They will be removed from your notifications.",
        deleting: "Deleting...", deleted: "Notifications deleted", deleteFailed: "Couldn't delete your notifications",
    },
    de: {
        select: "Auswählen", selectAll: "Alle auswählen", deselectAll: "Auswahl aufheben", selectedCount: "{count} ausgewählt",
        deleteSelected: "Ausgewählte löschen", deleteAll: "Alle löschen",
        deleteTitleSelected: "Ausgewählte Benachrichtigungen löschen?", deleteTitleAll_all: "Alle Benachrichtigungen löschen?",
        deleteTitleAll_unread: "Alle ungelesenen Benachrichtigungen löschen?", deleteTitleAll_mentions: "Alle Erwähnungen löschen?",
        deleteText: "Sie werden aus deinen Benachrichtigungen entfernt.",
        deleting: "Wird gelöscht...", deleted: "Benachrichtigungen gelöscht", deleteFailed: "Benachrichtigungen konnten nicht gelöscht werden",
    },
    es: {
        select: "Seleccionar", selectAll: "Seleccionar todo", deselectAll: "Deseleccionar todo", selectedCount: "{count} seleccionadas",
        deleteSelected: "Eliminar seleccionadas", deleteAll: "Eliminar todo",
        deleteTitleSelected: "¿Eliminar las notificaciones seleccionadas?", deleteTitleAll_all: "¿Eliminar todas las notificaciones?",
        deleteTitleAll_unread: "¿Eliminar todas las notificaciones no leídas?", deleteTitleAll_mentions: "¿Eliminar todas las menciones?",
        deleteText: "Se quitarán de tus notificaciones.",
        deleting: "Eliminando...", deleted: "Notificaciones eliminadas", deleteFailed: "No se pudieron eliminar tus notificaciones",
    },
    fr: {
        select: "Sélectionner", selectAll: "Tout sélectionner", deselectAll: "Tout désélectionner", selectedCount: "{count} sélectionnée(s)",
        deleteSelected: "Supprimer la sélection", deleteAll: "Tout supprimer",
        deleteTitleSelected: "Supprimer les notifications sélectionnées ?", deleteTitleAll_all: "Supprimer toutes les notifications ?",
        deleteTitleAll_unread: "Supprimer toutes les notifications non lues ?", deleteTitleAll_mentions: "Supprimer toutes les mentions ?",
        deleteText: "Elles seront retirées de vos notifications.",
        deleting: "Suppression...", deleted: "Notifications supprimées", deleteFailed: "Impossible de supprimer vos notifications",
    },
    it: {
        select: "Seleziona", selectAll: "Seleziona tutto", deselectAll: "Deseleziona tutto", selectedCount: "{count} selezionate",
        deleteSelected: "Elimina selezionate", deleteAll: "Elimina tutto",
        deleteTitleSelected: "Eliminare le notifiche selezionate?", deleteTitleAll_all: "Eliminare tutte le notifiche?",
        deleteTitleAll_unread: "Eliminare tutte le notifiche non lette?", deleteTitleAll_mentions: "Eliminare tutte le menzioni?",
        deleteText: "Verranno rimosse dalle tue notifiche.",
        deleting: "Eliminazione in corso...", deleted: "Notifiche eliminate", deleteFailed: "Impossibile eliminare le tue notifiche",
    },
    ja: {
        select: "選択", selectAll: "すべて選択", deselectAll: "選択を解除", selectedCount: "{count}件を選択中",
        deleteSelected: "選択した項目を削除", deleteAll: "すべて削除",
        deleteTitleSelected: "選択した通知を削除しますか？", deleteTitleAll_all: "すべての通知を削除しますか？",
        deleteTitleAll_unread: "未読の通知をすべて削除しますか？", deleteTitleAll_mentions: "メンションをすべて削除しますか？",
        deleteText: "通知から削除されます。",
        deleting: "削除中...", deleted: "通知を削除しました", deleteFailed: "通知を削除できませんでした",
    },
    pl: {
        select: "Wybierz", selectAll: "Zaznacz wszystko", deselectAll: "Odznacz wszystko", selectedCount: "Zaznaczono: {count}",
        deleteSelected: "Usuń zaznaczone", deleteAll: "Usuń wszystko",
        deleteTitleSelected: "Usunąć zaznaczone powiadomienia?", deleteTitleAll_all: "Usunąć wszystkie powiadomienia?",
        deleteTitleAll_unread: "Usunąć wszystkie nieprzeczytane powiadomienia?", deleteTitleAll_mentions: "Usunąć wszystkie wzmianki?",
        deleteText: "Zostaną usunięte z Twoich powiadomień.",
        deleting: "Usuwanie...", deleted: "Powiadomienia usunięte", deleteFailed: "Nie udało się usunąć powiadomień",
    },
    pt: {
        select: "Selecionar", selectAll: "Selecionar tudo", deselectAll: "Desmarcar tudo", selectedCount: "{count} selecionadas",
        deleteSelected: "Excluir selecionadas", deleteAll: "Excluir tudo",
        deleteTitleSelected: "Excluir as notificações selecionadas?", deleteTitleAll_all: "Excluir todas as notificações?",
        deleteTitleAll_unread: "Excluir todas as notificações não lidas?", deleteTitleAll_mentions: "Excluir todas as menções?",
        deleteText: "Elas serão removidas das suas notificações.",
        deleting: "Excluindo...", deleted: "Notificações excluídas", deleteFailed: "Não foi possível excluir suas notificações",
    },
    tr: {
        select: "Seç", selectAll: "Tümünü seç", deselectAll: "Seçimi kaldır", selectedCount: "{count} seçildi",
        deleteSelected: "Seçilenleri sil", deleteAll: "Tümünü sil",
        deleteTitleSelected: "Seçilen bildirimler silinsin mi?", deleteTitleAll_all: "Tüm bildirimler silinsin mi?",
        deleteTitleAll_unread: "Okunmamış tüm bildirimler silinsin mi?", deleteTitleAll_mentions: "Tüm bahsetmeler silinsin mi?",
        deleteText: "Bildirimlerinden kaldırılacak.",
        deleting: "Siliniyor...", deleted: "Bildirimler silindi", deleteFailed: "Bildirimlerin silinemedi",
    },
};

// Shown when the server can't delete (the "Api" texts)
const API = {
    en: "Couldn't delete your notifications",
    de: "Benachrichtigungen konnten nicht gelöscht werden",
    es: "No se pudieron eliminar tus notificaciones",
    fr: "Impossible de supprimer vos notifications",
    it: "Impossibile eliminare le tue notifiche",
    ja: "通知を削除できませんでした",
    pl: "Nie udało się usunąć powiadomień",
    pt: "Não foi possível excluir suas notificações",
    tr: "Bildirimlerin silinemedi",
};

// Puts new lines right after `"<namespace>": {`, skipping texts that already exist
function addTo(raw, namespace, entries, data) {
    const open = new RegExp(`^    "${namespace}": \\{\\r?$`, "m");
    const match = open.exec(raw);
    if (!match) throw new Error(`"${namespace}" not found`);
    const fresh = Object.entries(entries).filter(([key]) => !(key in (data[namespace] ?? {})));
    if (fresh.length === 0) return raw;
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = fresh.map(([key, value]) => `        ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join(eol);
    const at = match.index + match[0].length;
    return raw.slice(0, at) + eol + lines + raw.slice(at);
}

let failed = false;
for (const lang of Object.keys(T)) {
    const file = `messages/${lang}.json`;
    try {
        let raw = fs.readFileSync(file, "utf8");
        const data = JSON.parse(raw);
        raw = addTo(raw, "Notifications", T[lang], data);
        raw = addTo(raw, "Api", { couldntDeleteNotifications: API[lang] }, data);
        JSON.parse(raw); // make sure the file is still valid before saving it
        fs.writeFileSync(file, raw, "utf8");
        console.log("done   ", file);
    } catch (error) {
        failed = true;
        console.log("FAILED ", file, "-", error.message);
    }
}
process.exit(failed ? 1 : 0);
// add-delete-keys.mjs
// Adds the new texts for deleting transaction history to messages/<language>.json.
// Run it once from the reader project folder:   node add-delete-keys.mjs
// It only inserts new lines (nothing else in the files changes) and skips any text that is already there.
import fs from "node:fs";

const T = {
    en: {
        select: "Select", selectAll: "Select all", deselectAll: "Deselect all", selectedCount: "{count} selected",
        deleteSelected: "Delete selected", deleteAll: "Delete all",
        deleteTitleSelected: "Delete selected transactions?", deleteTitleAll: "Delete all transactions?", deleteTitleFiltered: "Delete all matching transactions?",
        deleteText: "They will be removed from your history. Your balance and coins are not affected.",
        deleteTextFiltered: "Everything matching your current filters will be removed from your history. Your balance and coins are not affected.",
        deleting: "Deleting...", deleted: "Removed from your history", deleteFailed: "Couldn't delete your transactions",
    },
    de: {
        select: "Auswählen", selectAll: "Alle auswählen", deselectAll: "Auswahl aufheben", selectedCount: "{count} ausgewählt",
        deleteSelected: "Ausgewählte löschen", deleteAll: "Alle löschen",
        deleteTitleSelected: "Ausgewählte Transaktionen löschen?", deleteTitleAll: "Alle Transaktionen löschen?", deleteTitleFiltered: "Alle passenden Transaktionen löschen?",
        deleteText: "Sie werden aus deinem Verlauf entfernt. Dein Guthaben und deine Münzen bleiben unverändert.",
        deleteTextFiltered: "Alles, was zu deinen aktuellen Filtern passt, wird aus deinem Verlauf entfernt. Dein Guthaben und deine Münzen bleiben unverändert.",
        deleting: "Wird gelöscht...", deleted: "Aus deinem Verlauf entfernt", deleteFailed: "Transaktionen konnten nicht gelöscht werden",
    },
    es: {
        select: "Seleccionar", selectAll: "Seleccionar todo", deselectAll: "Deseleccionar todo", selectedCount: "{count} seleccionadas",
        deleteSelected: "Eliminar seleccionadas", deleteAll: "Eliminar todo",
        deleteTitleSelected: "¿Eliminar las transacciones seleccionadas?", deleteTitleAll: "¿Eliminar todas las transacciones?", deleteTitleFiltered: "¿Eliminar todas las transacciones coincidentes?",
        deleteText: "Se quitarán de tu historial. Tu saldo y tus monedas no se ven afectados.",
        deleteTextFiltered: "Todo lo que coincida con tus filtros actuales se quitará de tu historial. Tu saldo y tus monedas no se ven afectados.",
        deleting: "Eliminando...", deleted: "Quitado de tu historial", deleteFailed: "No se pudieron eliminar tus transacciones",
    },
    fr: {
        select: "Sélectionner", selectAll: "Tout sélectionner", deselectAll: "Tout désélectionner", selectedCount: "{count} sélectionnée(s)",
        deleteSelected: "Supprimer la sélection", deleteAll: "Tout supprimer",
        deleteTitleSelected: "Supprimer les transactions sélectionnées ?", deleteTitleAll: "Supprimer toutes les transactions ?", deleteTitleFiltered: "Supprimer toutes les transactions correspondantes ?",
        deleteText: "Elles seront retirées de votre historique. Votre solde et vos pièces ne sont pas affectés.",
        deleteTextFiltered: "Tout ce qui correspond à vos filtres actuels sera retiré de votre historique. Votre solde et vos pièces ne sont pas affectés.",
        deleting: "Suppression...", deleted: "Retiré de votre historique", deleteFailed: "Impossible de supprimer vos transactions",
    },
    it: {
        select: "Seleziona", selectAll: "Seleziona tutto", deselectAll: "Deseleziona tutto", selectedCount: "{count} selezionate",
        deleteSelected: "Elimina selezionate", deleteAll: "Elimina tutto",
        deleteTitleSelected: "Eliminare le transazioni selezionate?", deleteTitleAll: "Eliminare tutte le transazioni?", deleteTitleFiltered: "Eliminare tutte le transazioni corrispondenti?",
        deleteText: "Verranno rimosse dalla tua cronologia. Il tuo saldo e le tue monete non vengono modificati.",
        deleteTextFiltered: "Tutto ciò che corrisponde ai filtri attuali verrà rimosso dalla tua cronologia. Il tuo saldo e le tue monete non vengono modificati.",
        deleting: "Eliminazione in corso...", deleted: "Rimosso dalla tua cronologia", deleteFailed: "Impossibile eliminare le tue transazioni",
    },
    ja: {
        select: "選択", selectAll: "すべて選択", deselectAll: "選択を解除", selectedCount: "{count}件を選択中",
        deleteSelected: "選択した項目を削除", deleteAll: "すべて削除",
        deleteTitleSelected: "選択した取引を削除しますか？", deleteTitleAll: "すべての取引を削除しますか？", deleteTitleFiltered: "該当するすべての取引を削除しますか？",
        deleteText: "履歴から削除されます。残高とコインには影響しません。",
        deleteTextFiltered: "現在のフィルターに一致するものすべてが履歴から削除されます。残高とコインには影響しません。",
        deleting: "削除中...", deleted: "履歴から削除しました", deleteFailed: "取引を削除できませんでした",
    },
    pl: {
        select: "Wybierz", selectAll: "Zaznacz wszystko", deselectAll: "Odznacz wszystko", selectedCount: "Zaznaczono: {count}",
        deleteSelected: "Usuń zaznaczone", deleteAll: "Usuń wszystko",
        deleteTitleSelected: "Usunąć zaznaczone transakcje?", deleteTitleAll: "Usunąć wszystkie transakcje?", deleteTitleFiltered: "Usunąć wszystkie pasujące transakcje?",
        deleteText: "Zostaną usunięte z Twojej historii. Saldo i monety pozostają bez zmian.",
        deleteTextFiltered: "Wszystko, co pasuje do bieżących filtrów, zostanie usunięte z Twojej historii. Saldo i monety pozostają bez zmian.",
        deleting: "Usuwanie...", deleted: "Usunięto z historii", deleteFailed: "Nie udało się usunąć transakcji",
    },
    pt: {
        select: "Selecionar", selectAll: "Selecionar tudo", deselectAll: "Desmarcar tudo", selectedCount: "{count} selecionadas",
        deleteSelected: "Excluir selecionadas", deleteAll: "Excluir tudo",
        deleteTitleSelected: "Excluir as transações selecionadas?", deleteTitleAll: "Excluir todas as transações?", deleteTitleFiltered: "Excluir todas as transações correspondentes?",
        deleteText: "Elas serão removidas do seu histórico. Seu saldo e suas moedas não são afetados.",
        deleteTextFiltered: "Tudo o que corresponder aos seus filtros atuais será removido do seu histórico. Seu saldo e suas moedas não são afetados.",
        deleting: "Excluindo...", deleted: "Removido do seu histórico", deleteFailed: "Não foi possível excluir suas transações",
    },
    tr: {
        select: "Seç", selectAll: "Tümünü seç", deselectAll: "Seçimi kaldır", selectedCount: "{count} seçildi",
        deleteSelected: "Seçilenleri sil", deleteAll: "Tümünü sil",
        deleteTitleSelected: "Seçilen işlemler silinsin mi?", deleteTitleAll: "Tüm işlemler silinsin mi?", deleteTitleFiltered: "Eşleşen tüm işlemler silinsin mi?",
        deleteText: "Geçmişinden kaldırılacak. Bakiyen ve jetonların etkilenmez.",
        deleteTextFiltered: "Mevcut filtrelerine uyan her şey geçmişinden kaldırılacak. Bakiyen ve jetonların etkilenmez.",
        deleting: "Siliniyor...", deleted: "Geçmişinden kaldırıldı", deleteFailed: "İşlemlerin silinemedi",
    },
};

// Shown when the server can't delete (the "Api" texts)
const API = {
    en: "Couldn't delete your transactions",
    de: "Transaktionen konnten nicht gelöscht werden",
    es: "No se pudieron eliminar tus transacciones",
    fr: "Impossible de supprimer vos transactions",
    it: "Impossibile eliminare le tue transazioni",
    ja: "取引を削除できませんでした",
    pl: "Nie udało się usunąć transakcji",
    pt: "Não foi possível excluir suas transações",
    tr: "İşlemlerin silinemedi",
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
        raw = addTo(raw, "Transactions", T[lang], data);
        raw = addTo(raw, "Api", { couldntDeleteTransactions: API[lang] }, data);
        JSON.parse(raw); // make sure the file is still valid before saving it
        fs.writeFileSync(file, raw, "utf8");
        console.log("done   ", file);
    } catch (error) {
        failed = true;
        console.log("FAILED ", file, "-", error.message);
    }
}
process.exit(failed ? 1 : 0);
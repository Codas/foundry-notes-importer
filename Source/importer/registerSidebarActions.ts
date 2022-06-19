// create menu option on journal entry folder
import { readSetting, ValidSetting } from "../Utils/Settings";
import { ImportNotesForm } from "./ImportNotesForm";

function registerSidebarActions(): void {
	const origGetFolderContextOptions = (SidebarDirectory.prototype as any)._getFolderContextOptions;
	const gameRef = game as Game;
	(SidebarDirectory.prototype as any)._getFolderContextOptions = function () {
		const opts = origGetFolderContextOptions();
		opts.push({
			name: "Import Notes",
			icon: `<i class="fas fa-file-import"></i>`,
			condition: (header: any) => {
				if (!gameRef.user?.isGM) {
					return false;
				}
				const folder = gameRef.folders?.get(header.parent().data().folderId);
				return folder?.type === "JournalEntry";
			},
			callback: (header: any) => {
				const li = header.parent();
				const folder = gameRef.folders?.get(li.data().folderId);
				if (folder == null) {
					return;
				}
				importData(folder);
			},
		});
		return opts;
	};
}

async function importData(folder: StoredDocument<Folder>) {
	const notesDirectory = readSetting<string>(ValidSetting.NotesDirectory);
	// setProgress("Fetching note data", 0);
	const advIndexRes = await fetch(`${notesDirectory}/adv_index.json`);
	// setProgressDone();
	await new ImportNotesForm(await advIndexRes.json(), folder).render(true);
}

export { registerSidebarActions };

import { FolderDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/folderData";
import Global from "../Globals";
import { getTemplatePath, Templates } from "../PreloadTemplates";
import Logger from "../Utils/Logger";
import { readSetting, ValidSetting } from "../Utils/Settings";

interface AdventureIndex {
	adventureNamePath: Record<string, string>;
	adventureIdPath: Record<string, string>;
}

interface AdventureInfo {
	name: string;
	id: string;
	folders: FolderInfo[];
	journals: [];
}

interface FolderInfo {
	name: string;
	id: string;
	parentFolderId: string;
}

interface JournalInfo {
	id: string;
	name: string;
	content: string;
	idFolder: string;
}

type FolderMap = Map<string, string>;

interface ImportNotesFormData {
	adventures: Record<string, string>;
	selectedAdventure?: string | null;
}
interface ImportNotesManagedObject {
	selectedAdventure?: string | null;
}

class ImportNotesForm extends FormApplication<FormApplication.Options, ImportNotesFormData, ImportNotesManagedObject> {
	private game = game as Game;
	private notesDirectory = readSetting<string>(ValidSetting.NotesDirectory);

	constructor(private advIndex: AdventureIndex, private folder: StoredDocument<Folder>) {
		super({}, ImportNotesForm.defaultOptions);
	}

	static get defaultOptions(): FormApplication.Options {
		return mergeObject(super.defaultOptions, {
			closeOnSubmit: true,
			submitOnChange: false,
			submitOnClose: false,
			width: 300,
			template: getTemplatePath(Templates.Dialog),
			title: "Select Adventure to import",
			id: "import-notes",
		});
	}

	getData(): ImportNotesFormData {
		return {
			adventures: Object.fromEntries(Object.entries(this.advIndex.adventureNamePath).map(([k, v]) => [v, k])),
			selectedAdventure: this.folder.getFlag(Global.ModuleName, "id") as string,
		};
	}

	protected async _updateObject(event: SubmitEvent, formData?: Record<string, any> | undefined): Promise<unknown> {
		if (event.submitter?.getAttribute("type") != "submit") {
			return Promise.resolve(null);
		}
		const selectedAdventure = formData?.selectedAdventure;
		if (!selectedAdventure) {
			return Promise.resolve(null);
		}
		const advFile = `${this.notesDirectory}/adventures/${selectedAdventure}.json`;
		Logger.Ok(`loading advFile ${advFile}`);
		const adventureFileResp = await fetch(advFile);
		const adventureInfo: AdventureInfo = await adventureFileResp.json();
		const folderMap = await this.importFolders(adventureInfo.folders);
		await this.importNotes(folderMap, adventureInfo.journals);

		ui?.notifications?.info("Notes imported successfully");

		return Promise.resolve(null);
	}

	async importFolders(folderData: FolderInfo[]): Promise<FolderMap> {
		const rootFolder = this.folder;
		const dataRootFolder = folderData.find((f) => f.parentFolderId == null);
		const folderIdMap = new Map(dataRootFolder ? [[dataRootFolder.id, rootFolder.id]] : []);
		const folders = this.game.folders?.filter((f) => f.type === "JournalEntry") ?? [];
		const newFolders: FolderDataConstructorData[] = [];
		const updatedFolders = [];

		for (const folder of folderData) {
			const existing =
				folder.parentFolderId == null
					? rootFolder
					: folders.find((f) => f.getFlag(Global.ModuleName, "id") === folder.id);
			if (existing) {
				folderIdMap.set(folder.id, existing.id);
				updatedFolders.push({
					_id: existing.id,
					name: folder.name,
					flags: { [Global.ModuleName]: { id: folder.id } },
					parent: folderIdMap.get(folder.parentFolderId),
				});
			} else {
				newFolders.push({
					name: folder.name,
					flags: { [Global.ModuleName]: { id: folder.id } },
					type: "JournalEntry",
					parent: folderIdMap.get(folder.parentFolderId),
				});
			}
		}
		await Folder.updateDocuments(updatedFolders);
		const createdFolders = await Folder.createDocuments(newFolders);
		for (const newFolder of createdFolders) {
			folderIdMap.set(newFolder.getFlag(Global.ModuleName, "id") as string, newFolder.id);
		}
		return folderIdMap;
	}

	async importNotes(folderMap: FolderMap, documents: JournalInfo[]): Promise<void> {
		const journalsToCreate = [];
		const journalsToUpdate: {
			_id: string;
			name: string;
			content: string;
			folder?: string | null;
			flags: Record<string, { id: string }>;
		}[] = [];
		const jorunals = Array.from(this.game.journal ?? []);
		const journalMap = new Map<string, string>();
		for (const document of documents) {
			const baseJournal = {
				name: document.name,
				content: document.content,
				folder: folderMap.get(document.idFolder),
				flags: {
					[Global.ModuleName]: { id: document.id },
				},
			};
			const existing = jorunals.find((j) => document.id === j.getFlag(Global.ModuleName, "id"));
			if (existing) {
				journalsToUpdate.push({
					...baseJournal,
					_id: existing.id,
				});
				journalMap.set(document.id, existing.id);
			} else {
				journalsToCreate.push(baseJournal);
			}
		}
		const createdJournals = await JournalEntry.createDocuments(journalsToCreate);
		for (const journal of createdJournals) {
			const localId = journal.getFlag(Global.ModuleName, "id") as string;
			journalMap.set(localId as string, journal.id);
			journalsToUpdate.push({
				_id: journal.id,
				name: journal.name || "",
				content: journal.data.content,
				folder: journal.folder?.id,
				flags: {
					[Global.ModuleName]: { id: localId },
				},
			});
		}

		for (const journal of journalsToUpdate) {
			let content = journal.content ?? "";
			for (const [localId, remoteId] of journalMap.entries()) {
				content = content.replaceAll(localId, remoteId);
			}
			journal.content = content;
		}
		await JournalEntry.updateDocuments(journalsToUpdate);
	}
}

export { ImportNotesForm };

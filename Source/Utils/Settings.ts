import Globals, { Assert, Pair } from "../Globals";
import Logger from "./Logger";

class ModuleSettings {
	private constructor() {
		Logger.Ok("Loading configuration settings.");
	}

	private static instance: ModuleSettings;

	public static get(): ModuleSettings {
		if (ModuleSettings.instance) return ModuleSettings.instance;

		ModuleSettings.instance = new ModuleSettings();
		return ModuleSettings.instance;
	}

	private SettingsInit = false;
	public registerSettings(): void {
		if (this.SettingsInit) return;

		Assert(game instanceof Game);
		const g = game as Game;
		this.settingsList.forEach((item) => {
			g.settings.register(Globals.ModuleName, item[0], item[1]);
		});

		this.SettingsInit = true;
	}

	readonly settingsList = [
		// Add settings items here
		[
			ValidSetting.NotesDirectory,
			{
				name: "Notes directory?",
				scope: "world", // or client
				type: String,
				hint: "The folder that compiled note files are uploaded to",
				config: true, // It should appear in the configuration menu
				default: "imported-notes", // The DM is NOT cool by default
				filePicker: "folder",
				onChange: (val: unknown) => Logger.Ok(`data path: ${val}`),
			},
		] as Pair<ClientSettings.PartialSetting<string>>,
	];
}

export const registerSettings = (): void => ModuleSettings.get().registerSettings();

export const enum ValidSetting {
	NotesDirectory = "NotesDirectory",
}

export const getSetting = <T>(setting: ValidSetting): T | null => {
	const found = ModuleSettings.get().settingsList.find((x) => x[0] === setting);
	return found ? (found[1] as unknown as T) : null;
};

export const readSetting = <T>(setting: ValidSetting): T | null => {
	const g = game as Game;
	return g.settings.get(Globals.ModuleName, setting) as unknown as T | null;
};

import Logger from "./Utils/Logger";
import { preloadTemplates } from "./PreloadTemplates";
import { registerSettings } from "./Utils/Settings";
import { registerSidebarActions } from "./importer/registerSidebarActions";

Hooks.once("init", async () => {
	registerSettings();
	registerSidebarActions();
	await preloadTemplates();
});

Hooks.once("setup", () => {
	Logger.Log("Template module is being setup.");
});

Hooks.once("ready", () => {
	Logger.Ok("Template module is now ready.");
});

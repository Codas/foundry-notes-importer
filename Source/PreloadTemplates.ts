import Globals from "./Globals";

const enum Templates {
	Dialog = "dialog.html",
}

const preloadTemplates = async (): Promise<Handlebars.TemplateDelegate<any>[]> => {
	// Place relative paths in array below, e.g.:
	// const templates = [ rootPath + "actor/actor-sheet.hbs" ]
	// This would map to our local folder of /Assets/Templates/Actor/actor-sheet.hbs
	const templates = [getTemplatePath(Templates.Dialog)];
	return loadTemplates(templates);
};

const rootPath = `${Globals.IsModule ? "modules" : "systems"}/${Globals.ModuleName}/templates/`;
function getTemplatePath(template: Templates): string {
	return rootPath + template;
}

export { preloadTemplates, getTemplatePath, Templates };

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'run-x86-parser',
			name: 'Parse x86 Codeblocks',
			callback: () => {
				var tmp = document.getElementsByClassName("HyperMD-codeblock-begin-bg")
			//const pre = codeBlock.parentNode as HTMLPreElement;
			for(var i=0; i<tmp.length; i++){
				if(tmp[i].innerHTML.contains("x86")){
					//Find the start of an x86 codeblock
					tmp[i].classList.add("x86-instruction")
					var currelement = tmp[i]
					//While we haven't found the end
					while(!currelement.classList.value.contains("HyperMD-codeblock-end")){
						//If we are not at the end of the page, go to the next element
						currelement.classList.add("x86-instruction")
						if(currelement.nextElementSibling != null){
							currelement = currelement.nextElementSibling
							if(currelement.classList.value.contains("HyperMD-codeblock-end")){
								break
							}
						}
						else{
							console.log("end of document reached before end of codeblock")
							break
						}
						var orightml = currelement.innerHTML
						var innerpart = orightml.split(">")[1].split("<")[0]
						var firstspace = innerpart.indexOf(" ")
						var innerpart = "<span class=\"cm-hmd-codeblock x86-instruction\">" + innerpart.split(" ")[0] + "</span>" + innerpart.slice(firstspace,innerpart.length)
						var testing = orightml.split(">")[0] + ">" + innerpart + "<" + orightml.split(">")[1].split("<")[1]
						//console.log(testing) //need to wrap first word in class instruction
						currelement.innerHTML = testing
						console.log(currelement.innerHTML)
					}
					console.log("Done with that x86 codeblock")
				}
			}
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'create-flow-diagram',
			name: 'Convert x86 assembly into a flow diagram on a canvas',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				console.log(this.app.vault.getName());
				this.app.vault.create("./testing.md",editor.getSelection())
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click1', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

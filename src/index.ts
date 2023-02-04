import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault } from 'obsidian';

// Remember to rename these classes and interfaces!
var nodeid = 1;
var edgeid = 5555
var workingx = 0;
var workingy = 0;
var nodes: any[] = []
var edges: { id: number; fromNode: any; fromSide: string; toNode: number; toSide: string; label: string; }[] = [] //{"id":"d1e0d15da69178a9","fromNode":"4018052da21dde12","fromSide":"bottom","toNode":"0afaa4e14a75cfe1","toSide":"top","label":"false"}
var lines: string[] = []
var fromnode = -1
var locations: any = {}
var visitslocs: any = {}

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
		/*this.addCommand({
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
		});*/
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'create-flow-diagram',
			name: 'Convert x86 assembly into a flow diagram on a canvas',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				console.log(this.app.vault.getName());
				lines = [];
				nodes = [];
				nodes = [];
				edges = [];
				visitslocs = {};
				locations = {};
				nodeid = 1;
				edgeid = 5555;
				workingx = 0;
				workingy = 0;
				var tmp = editor.getSelection().split("\n")
				tmp.forEach(element => {
					if(element != ""){
						lines.push(element)
					}
				});
			
				lines.forEach((line,linenum) => {
					//Only look at lines that could be locations
					if(line.split("")[0] != '\t' && line.split("")[0] != " "){
						//Cut out white space and comments (#)
						var newkey = line.trim().split("#")[0].trim()
						if (!locations[newkey]) {
							locations[newkey] = linenum;
							visitslocs[newkey] = 0
						}
					}
				});
				generatenodes(0,lines,fromnode)
				this.app.vault.create("/pleasegod.canvas","{ \"nodes\":"+JSON.stringify(nodes) + ",\"edges\":" + JSON.stringify(edges) + "}")
				console.log("{ \"nodes\":"+JSON.stringify(nodes) + ",\"edges\":" + JSON.stringify(edges) + "}")
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
		//this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		//	console.log('click1', evt);
		//});

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
function generatenodes(linenum: any, text: any, fromnode: any){
    console.log(locations)
    var retarray = MakeNodeFromLineToNextJump(linenum, text, fromnode)
    var newnode: any = retarray[0]
	var whereto: any = retarray[1]
	if(newnode != null){
		fromnode = newnode['id']
		console.log("fromnode is " + fromnode)
		//Check if node is already in list
		var wegood = nodeAlredyAdded(newnode)
		if(wegood){
			return
		}
		else{
			nodes.push(newnode)
		}
		console.log("{ \"nodes\":"+JSON.stringify(nodes) + "}")
		console.log("need to jump here: " + whereto)
		//We are at the end of the file
	}
    if(whereto == "fin"){
        return
    }
    generatenodes(locations[whereto[0]], text, fromnode)
    if(whereto.length == 2){
        console.log("Oh boy, we at a split")
        console.log("going to line: " + whereto[1])
        generatenodes(whereto[1], text, fromnode)
    }
    return
}

//This function returns true if the node has already been added to the nodes array
function nodeAlredyAdded(checknode: any){
    var retval = false
    nodes.forEach(node => {
        if(checknode["startline"] == node["startline"] && checknode["endline"] == node["endline"]){
            retval = true
        }
    });
    return retval
}

//This function takes a line number and the assembly and creates a node from that line to the next jump instruction
//It then returns the new node at retarray[0] and the location to jump to at retarray[1]
//TODO: FIgure out nodeid, x, and y values
function MakeNodeFromLineToNextJump(linenum: any, text: any, fromnode: any) {
    var currnode = "```\n"
    var i = linenum
    var newnode
    var jmploc
	var newedge: any = {}
    console.log("curr line: " + i)
    while(i < text.length){
        var line = text[i]
        console.log("currently processing this line: " + line)
        if(line.split("")[0] == '\t' || line.split("")[0] == " "){
            if(line.trim().split("")[0] == 'j'){
                currnode = currnode + line + "\n```"
                newnode = {"id":nodeid, "x": workingx, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
                nodeid = nodeid + 1
                workingy = workingy + 350
                //Only parse the first node
                console.log(line.trim().slice(0,3))
                if(fromnode != -1){
                    newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
                    edges.push(newedge)
                    edgeid = edgeid + 1
                }
                if(line.trim().slice(0,3) == 'jmp'){
                    jmploc = [line.trim().slice(line.trim().indexOf(" ")+1,line.length).split("#")[0].trim()]
                }
                else{
                    jmploc = [line.trim().slice(line.trim().indexOf(" ")+1,line.length).split("#")[0].trim(),i+1]
                }
                i = text.length+20
            }
            else{
                currnode = currnode + line + "\n"
            }
        }
        else{
            //TODO: Handle location lines
            if(visitslocs[line.trim()] == 0){
                currnode = currnode + line + "\n"
                visitslocs[line.trim()] = nodeid
            }
            else{
				if(currnode == "```\n"){
					newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":visitslocs[line.trim()],"toSide":"top","label":""}
                    edges.push(newedge)
                    edgeid = edgeid + 1
				}
				else{
					currnode = currnode + "\n```"
					newnode = {"id":nodeid, "x": workingx, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
					workingy = workingy + 350
					if(fromnode != -1){
						newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
						edges.push(newedge)
						edgeid = edgeid + 1
						newedge = {"id":edgeid,"fromNode":nodeid,"fromSide":"bottom","toNode":visitslocs[line.trim()],"toSide":"top","label":""}
						edges.push(newedge)
						edgeid = edgeid + 1
					}
					nodeid = nodeid + 1
				}
				i = text.length+20
                jmploc = "fin"
            }
        }
        i = i + 1
    }
    //We got to the end of the assembly
    if(i != text.length+21)
    {
        currnode = currnode + "```"
        newnode = {"id":nodeid, "x": workingx, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
        jmploc = "fin"
        nodeid = nodeid + 1
        workingy = workingy + 350
        if(fromnode != -1){
            newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
            edges.push(newedge)
            edgeid = edgeid + 1
        }
    }
    return [newnode, jmploc]
}

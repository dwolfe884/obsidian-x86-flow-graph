import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault, Workspace } from 'obsidian';

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

export default class MyPlugin extends Plugin {

	async onload() {
		// This adds the command to take selected text and create code flow diagram
		this.addCommand({
			id: 'x86-create-flow-diagram',
			name: 'Convert x86 assembly into a flow diagram on a canvas',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// Array of splt
				lines = [];
				nodes = [];
				nodes = [];
				edges = [];
				// Dictionary where keys = memory locations and values = if they have been seen in a node (1) or not (0) 
				visitslocs = {};
				// Dictionary where keys = memory locations and values = line number
				locations = {};
				//NodeID's and EdgeID's must be unique for each node in a canvas
				nodeid = 1;
				edgeid = 5555;
				workingx = 0;
				workingy = 0;
				var tmp = editor.getSelection().split("\n")
				//For loop to remove blank lines and lines containing codeblock characters
				tmp.forEach(element => {
					if(element != "" && !element.contains("```")){
						lines.push(element)
					}
				});
			
				lines.forEach((line,linenum) => {
					//Only look at lines that could be locations
					if(line.split("")[0] != '\t' && line.split("")[0] != " "){
						//Cut out white space and comments (#)
						var newkey = line.trim().split("#")[0].trim()
						//Populate locations and visits array with line numbers and all 0's
						if (!locations[newkey]) {
							locations[newkey] = linenum;
							visitslocs[newkey] = 0
						}
					}
				});

				//Enter recursive function
				generatenodes(0,lines,fromnode,"")

				//Get current directory to produce canvas in
				var outfile = ""
				var currfile = this.app.workspace.getActiveFile()
				const d = new Date();
				if(currfile){
					var outfile = currfile.parent.path + "/" + d.getTime() + ".canvas"
				}
				this.app.vault.create(outfile,"{ \"nodes\":"+JSON.stringify(nodes) + ",\"edges\":" + JSON.stringify(edges) + "}")
			}
		});

	}
}


function generatenodes(linenum: any, text: any, fromnode: any, edgelabel: string){
    var retarray = MakeNodeFromLineToNextJump(linenum, text, fromnode, edgelabel)
    var newnode: any = retarray[0]
	var whereto: any = retarray[1]
	if(newnode != null){
		fromnode = newnode['id']
		//Check if node is already in list
		var wegood = nodeAlredyAdded(newnode)
		if(wegood){
			return
		}
		else{
			nodes.push(newnode)
		}
	}
	//We are at the end of the file
    if(whereto == "fin"){
        return
    }
	var edgelabel = "";
	if(whereto.length != 1){
		edgelabel = "true"
	}
    generatenodes(locations[whereto[0]], text, fromnode, edgelabel)
    if(whereto.length == 2){
        generatenodes(whereto[1], text, fromnode, "false")
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
//linenum : what line to start processing on
//text : full assembly code block
//fromnode : nodeID of the previous node that needs to be connected via an edge (-1 if there isn't one)
//edgelabel : "true","false", or "" to color and label the edges 
function MakeNodeFromLineToNextJump(linenum: any, text: any, fromnode: any, edgelabel: string) {
    var currnode = "```\n"
    var i = linenum
    var newnode
    var jmploc
	var newedge: any = {}
	var edgecolor = ""
	var side = 1;
	if(edgelabel == "false"){
		edgecolor = "1"
		side = -1
	}
	else if(edgelabel == "true"){
		edgecolor = "4"
		side = 1
	}
    while(i < text.length){
        var line = text[i]
		//If the current line is an instruction and not a location
        if(line.split("")[0] == '\t' || line.split("")[0] == " "){
            if(line.trim().split("")[0] == 'j'){
                currnode = currnode + line + "\n```"
                newnode = {"id":nodeid, "x": workingx*side, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
                nodeid = nodeid + 1
                workingy = workingy + 300
				workingx = workingx + 50*nodeid
                //Only parse the first node
                if(fromnode != -1){
                    newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":edgelabel, "color":edgecolor}
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
		//Else, we're handling a location
        else{
			//Have we visited this location before (0 == no) and is this not the first line of a node?
            if(visitslocs[line.trim()] == 0 && i != linenum){
				//Close the node text and create a node object
                currnode = currnode + "```"
				newnode = {"id":nodeid, "x": workingx*side, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
				workingy = workingy + 300
				workingx = workingx + (50*nodeid)
				nodeid = nodeid + 1
				//Set the jump location to the location name strimming away the command and comments
				jmploc = [line.trim().slice(line.trim().indexOf(" ")+1,line.length).split("#")[0].trim()]
				//If there is a node before the current one
				if(fromnode != -1){
					newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":edgelabel,"color":edgecolor}
					edges.push(newedge)
					edgeid = edgeid + 1
				}
				//Otherwise just leave
				//currnode = currnode + line + "\n"
                //visitslocs[line.trim()] = nodeid
				i = text.length+20
            }
			//Have we visited this location before and is this the first line of a node?
			else if(visitslocs[line.trim()] == 0 && i == linenum){
				currnode = currnode + line + "\n"
                visitslocs[line.trim()] = nodeid
			}
			//We have visited this before
            else{
				//If this is an empty node, just draw a line from the previous node to the already visited one
				if(currnode == "```\n"){
					newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":visitslocs[line.trim()],"toSide":"top","label":edgelabel,"color":edgecolor}
                    edges.push(newedge)
                    edgeid = edgeid + 1
				}
				//If it's not empty make the node and draw 2 edges
				else{
					currnode = currnode + "\n```"
					newnode = {"id":nodeid, "x": workingx*side, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
					workingy = workingy + 300
					workingx = workingx + (50*nodeid)
					if(fromnode != -1){
						newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":edgelabel,"color":edgecolor}
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
		//If the node is empty, add a little message
		if(currnode == "```\n"){
			currnode = currnode + "End of assembly\n```"			
		}
		//Otherwise just close it
		else{
        	currnode = currnode + "```"
		}
		newnode = {"id":nodeid, "x": workingx, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
        jmploc = "fin"
        nodeid = nodeid + 1
        workingy = workingy + 350
        if(fromnode != -1){
            newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":edgelabel, "color":edgecolor}
            edges.push(newedge)
            edgeid = edgeid + 1
        }
    }
    return [newnode, jmploc]
}

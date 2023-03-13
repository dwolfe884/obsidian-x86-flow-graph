import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault, Workspace } from 'obsidian';
import { CanvasTextData, CanvasColor, NodeSide, CanvasEdgeData, CanvasData } from 'obsidian/canvas';



export default class x86_flow_graph extends Plugin {

	nodeid = 1;
	edgeid = 5555
	workingx = 0;
	workingy = 0;
	nodes: any[] = []
	edges: CanvasEdgeData[] = [] //{"id":"d1e0d15da69178a9","fromNode":"4018052da21dde12","fromSide":"bottom","toNode":"0afaa4e14a75cfe1","toSide":"top","label":"false"}
	lines: string[] = []
	fromnode = -1
	locations: any = {}
	visitslocs: any = {}
	colorGreen: CanvasColor = "4"
	colorRed: CanvasColor = "1"
	
	async onload(){
		// This adds the command to take selected text and create code flow diagram
		this.addCommand({
			id: 'x86-create-flow-diagram',
			name: 'Convert x86 assembly into a flow diagram on a canvas',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// Array of splt
				this.lines = [];
				this.nodes = [];
				this.edges = [];
				// Dictionary where keys = memory locations and values = if they have been seen in a node (1) or not (0) 
				this.visitslocs = {};
				// Dictionary where keys = memory locations and values = line number
				this.locations = {};
				//NodeID's and EdgeID's must be unique for each node in a canvas
				this.nodeid = 1;
				this.edgeid = 5555;
				this.workingx = 0;
				this.workingy = 0;
				const tmp = editor.getSelection().split("\n")
				//For loop to remove blank lines and lines containing codeblock characters
				tmp.forEach(element => {
					if(element != "" && !element.contains("```")){
						this.lines.push(element)
					}
				});
			
				this.lines.forEach((line,linenum) => {
					//Only look at lines that could be locations
					if(line[0] != '\t' && line[0] != " "){
						//Cut out white space and comments (#)
						let newkey = line.trim().split("#")[0].trim()
						//Strip off ":" if they are at the end of the location string
						if(newkey[newkey.length-1] == ":"){
							newkey = newkey.slice(0,newkey.length-1)
						}
						//Populate locations and visits array with line numbers and all 0's
						if (!(newkey in this.locations)) {
							this.locations[newkey] = linenum;
							this.visitslocs[newkey] = 0
						}
					}
				});

				//Enter recursive function
				this.generatenodes(0,this.lines,this.fromnode,"")

				//Get current directory to produce canvas in
				let outfile = ""
				const currfile = this.app.workspace.getActiveFile()
				const d = new Date();
				if(currfile){
					outfile = currfile.parent.path + "/" + d.getTime() + ".canvas"
				}
				let finalCanvas: CanvasData = {nodes: this.nodes, edges: this.edges}
				this.app.vault.create(outfile,JSON.stringify(finalCanvas))
			}
		});

	}
//Recursive function alert! Runs itself once for uncondontional jumps (jmps) and twice for conditional jumps (jz)
//Returns when it reaches the end of the assembly section OR if it returns to a code block it's seen before 
generatenodes(linenum: any, text: any, fromnode: any, edgelabel: string){
    const retarray = this.MakeNodeFromLineToNextJump(linenum, text, fromnode, edgelabel)
    let newnode: any = retarray[0]
	let whereto: any = retarray[1]
	if(newnode != null){
		fromnode = newnode['id']
		//Check if node is already in list
		const wegood = this.nodeAlredyAdded(newnode)
		if(wegood){
			return
		}
		else{
			this.nodes.push(newnode)
		}
	}
	//We are at the end of the file
    if(whereto == "fin"){
        return
    }
	edgelabel = "";
	if(whereto.length != 1){
		edgelabel = "true"
	}
	//Error Handling for trying to jump to a non-existant location
	if(!(whereto[0] in this.locations)){
		//Make the error node
		newnode = this.generateNewNode("```\nERROR: Jumping to non-existant\nlocation " + whereto[0].trim() + "\n```", -1, -1, 1)
		//nodeid-2 refers to the ID of the node that generated the error
		const newedge: CanvasEdgeData = {id:this.edgeid.toString(),fromNode:(this.nodes[this.nodes.length-1].id.toString()/*this.nodeid-2*/).toString(),fromSide:"bottom",toNode:newnode['id'],toSide:"top",label:"true", color:this.colorGreen}
		this.edges.push(newedge)
		this.nodes.push(newnode)
		this.edgeid = this.edgeid + 1
	}
	else{
		this.generatenodes(this.locations[whereto[0]], text, fromnode, edgelabel)
	}
	if(whereto.length == 2){
		this.generatenodes(whereto[1], text, fromnode, "false")
	}
    return
}

//This function returns true if the node has already been added to the nodes array
nodeAlredyAdded(checknode: any){
    let retval = false
    this.nodes.forEach((node: { [x: string]: any; }) => {
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
MakeNodeFromLineToNextJump(linenum: any, text: any, fromnode: any, edgelabel: string) {
    let currnode = "```\n"
    let i = linenum
    let newnode
    let jmploc
	let newedge: CanvasEdgeData
	let edgecolor = ""
	let side = 1;
	if(edgelabel == "false"){
		edgecolor = "1"
		side = -1
	}
	else if(edgelabel == "true"){
		edgecolor = "4"
		side = 1
	}
    while(i < text.length){
        let line = text[i]
		//If the current line is an instruction and not a location
        if(line[0] == '\t' || line[0] == " "){
			//If the current instruction is a jump
            if(line.trim()[0] == 'j'){
                currnode = currnode + line + "\n```"
                newnode = this.generateNewNode(currnode, linenum, i, side)
                //Only parse the first node
                if(fromnode != -1){
                    newedge = {id:this.edgeid.toString(),fromNode:fromnode.toString(),fromSide:"bottom",toNode:newnode["id"],toSide:"top",label:edgelabel, color:edgecolor}
                    this.edges.push(newedge)
                    this.edgeid = this.edgeid + 1
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
			line = line.trim()
			//Remove ":" if at the end of location
			if(line[line.length-1] == ":"){
				line = line.slice(0,line.length-1)
			}
			//Have we visited this location before (0 == no) and is this not the first line of a node?
            if(this.visitslocs[line.trim()] == 0 && i != linenum){
				//Close the node text and create a node object
                currnode = currnode + "```"
				newnode = this.generateNewNode(currnode, linenum, i, side)
				//Set the jump location to the location name strimming away the command and comments
				jmploc = [line.trim().slice(line.trim().indexOf(" ")+1,line.length).split("#")[0].trim()]
				//If there is a node before the current one
				if(fromnode != -1){
					newedge = {id:this.edgeid.toString(),fromNode:fromnode.toString(),fromSide:"bottom",toNode:newnode["id"].toString(),toSide:"top",label:edgelabel,color:edgecolor}
					this.edges.push(newedge)
					this.edgeid = this.edgeid + 1
				}
				i = text.length+20
            }
			//Have we visited this location before and is this the first line of a node?
			else if(this.visitslocs[line.trim()] == 0 && i == linenum){
				currnode = currnode + line + "\n"
                this.visitslocs[line.trim()] = this.nodeid
			}
			//We have visited this before
            else{
				//If this is an empty node, just draw a line from the previous node to the already visited one
				if(currnode == "```\n"){
					newedge = {id:this.edgeid.toString(),fromNode:fromnode.toString(),fromSide:"bottom",toNode:this.visitslocs[line.trim()].toString(),toSide:"top",label:edgelabel,color:edgecolor}
                    this.edges.push(newedge)
                    this.edgeid = this.edgeid + 1
				}
				//If it's not empty make the node and draw 2 edges
				else{
					currnode = currnode + "\n```"
					newnode = this.generateNewNode(currnode, linenum, i, side)
					if(fromnode != -1){
						//Draw edge from previous node to the new node
						newedge = {id:this.edgeid.toString(),fromNode:fromnode.toString(),fromSide:"bottom",toNode:newnode["id"].toString(),toSide:"top",label:edgelabel,color:edgecolor}
						this.edges.push(newedge)
						this.edgeid = this.edgeid + 1
						//Draw edge from new node to previously seen node
						newedge = {id:this.edgeid.toString(),fromNode:newnode["id"].toString(),fromSide:"bottom",toNode:this.visitslocs[line.trim()].toString(),toSide:"top",label:""}
						this.edges.push(newedge)
						this.edgeid = this.edgeid + 1
					}
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
		newnode = this.generateNewNode(currnode, linenum, i, side)
		jmploc = "fin"
        if(fromnode != -1){
            newedge = {id:this.edgeid.toString(),fromNode:fromnode.toString(),fromSide:"bottom",toNode:newnode["id"].toString(),toSide:"top",label:edgelabel, color:edgecolor}
            this.edges.push(newedge)
            this.edgeid = this.edgeid + 1
        }
    }
    return [newnode, jmploc]
}

generateNewNode(nodeText: string, startLineNum: any, endLineNum: any, side: any){
	//const newnode = {"id":nodeid, "x": workingx*side, "y": workingy, "width": 550,"height": 25*nodeText.split("\n").length, "type": "text", "text": nodeText, "startline": startLineNum,"endline": endLineNum}
	const newnode: x86Node = {
		type: 'text',
		id: this.nodeid.toString(),
		x: this.workingx*side,
		y: this.workingy,
		width: 550,
		height: 35*nodeText.split("\n").length,
		text: nodeText,
		startline: startLineNum,
		endline: endLineNum
	  };
	  
	this.workingy = this.workingy + 300
	this.workingx = this.workingx + (50*this.nodeid)
	this.nodeid = this.nodeid + 1
	return newnode
}
}

//Extending CanvasNodeData to add attributes for detecting repeated blocks of code
interface x86Node extends CanvasTextData{
	startline: number,
	endline: number
}
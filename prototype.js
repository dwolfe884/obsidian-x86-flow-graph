var nodeid = 1;
var edgeid = 5555
var workingx = 0;
var workingy = 0;
var input = 
`
    mov [ebp+var_4] 0       # i = 0
    jmp loc_401016    # jump inside of loop
loc_40100D
    mov eax, [ebp+var_4]    
    add eax, 1              # add 1 to i
    mov [ebp+var_4], 1
loc_401016
    cmp [ebp+var_4], 64h    # check if i is less than 100
    jge loc_40102F    # if it is, jump out of loop
    mov ecx, [ebp+var_4]    # otherwise print value of i
    push ecx
    push offset aID; "i equals %d\\n"
    call printf
    add esp, 8
    jmp loc_40100D    # jump to increment step
loc_40102F`
var nodes = []
var edges = [] //{"id":"d1e0d15da69178a9","fromNode":"4018052da21dde12","fromSide":"bottom","toNode":"0afaa4e14a75cfe1","toSide":"top","label":"false"}
var tmp = input.split("\n")
var lines = []
var fromnode = -1
var locations = {}
var visitslocs = {}
//Recursive function to visit each node and generate the other nodes
//Returns when it either hits the end of the assembly or returns to a node that has already been added
function generatenodes(linenum, text, fromnode){
    console.log(locations)
    retarray = MakeNodeFromLineToNextJump(linenum, text, fromnode)
    var newnode = retarray[0]
    fromnode = newnode['id']
    console.log("fromnode is " + fromnode)
    var whereto = retarray[1]
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
function nodeAlredyAdded(checknode){
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
function MakeNodeFromLineToNextJump(linenum, text, fromnode) {
    var currnode = "```\n"
    var i = linenum
    var newnode
    var jmploc
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
                    var newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
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
                currnode = currnode + "\n```"
                newnode = {"id":nodeid, "x": workingx, "y": workingy, "width": 550,"height": 25*currnode.split("\n").length, "type": "text", "text": currnode, "startline": linenum,"endline": i}
                workingy = workingy + 350
                if(fromnode != -1){
                    var newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
                    edges.push(newedge)
                    edgeid = edgeid + 1
                    var newedge = {"id":edgeid,"fromNode":nodeid,"fromSide":"bottom","toNode":visitslocs[line.trim()],"toSide":"top","label":""}
                    edges.push(newedge)
                    edgeid = edgeid + 1
                }
                nodeid = nodeid + 1
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
            var newedge = {"id":edgeid,"fromNode":fromnode,"fromSide":"bottom","toNode":newnode["id"],"toSide":"top","label":""}
            edges.push(newedge)
            edgeid = edgeid + 1
        }
    }
    return [newnode, jmploc]
}

//NOTE: If there are \n in strings or comments it will fuck up

function starter() {
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
    console.log("{ \"nodes\":"+JSON.stringify(nodes) + ",\"edges\":" + JSON.stringify(edges) + "}")
}
document.getElementById("butt").addEventListener("click",starter)
//generatenodes(0,lines)

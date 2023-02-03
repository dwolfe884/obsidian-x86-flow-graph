var input = 
`
    mov [ebp+var_4] 0       # i = 0
    jmp short loc_401016    # jump inside of loop
loc_40100D
    mov eax, [ebp+var_4]    
    add eax, 1              # add 1 to i
    mov [ebp+var_4], 1
loc_401016:
    cmp [ebp+var_4], 64h    # check if i is less than 100
    jge short loc_40102F    # if it is, jump out of loop
    mov ecx, [ebp+var_4]    # otherwise print value of i
    push ecx
    push offset aID; "i equals %d\\n"
    call printf
    add esp, 8
    jmp short loc_40100D    # jump to increment step
loc_40102F`

//NOTE: If there are \n in strings or comments it will fuck up

input.split("\n").slice(1,input.split("\n").length).forEach((element, ids) => {
    const myre = /^\w.*/
    //if("\t")
    console.log(myre.exec(element)) 
    if(myre.exec(element) != null){
        console.log("At index: " + ids)
    }
});
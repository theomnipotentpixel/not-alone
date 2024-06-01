// keeping the old editor intact, forked to a new one

const maxtilepage = 21

function preload() {
	tilesets = {}
	tilesets.grassy = loadImage("grassy.png")
	npcs = loadImage("npcs.png")
	startpos = loadImage("startpos.png")
	grassy_outline = loadImage("grassy_outline.png")
}

let saveid = -1

if (!localStorage.lvlpacks) localStorage.lvlpacks = '[]'
let lvlpacks = JSON.parse(localStorage.lvlpacks)

let savebtn = document.getElementById("save")
let load = document.getElementById("load")

savebtn.onclick = ()=>{
	let packdata =  JSON.stringify(levelpack[0]) + "\n" + 
					levelpack[1] + "\n" + 
					levelpack[2] + "\n" + 
					levelPackName.value
	if (saveid == -1) {
		saveid = lvlpacks.length
		lvlpacks.push(packdata)
	} else {
		lvlpacks[saveid] = packdata
	}
	localStorage.lvlpacks = JSON.stringify(lvlpacks)
}

load.onclick = ()=>{
	canvas.style.display = "none"
	if (span) span.remove()
	span = document.createElement("span")
	span.style.padding = "10px"
	span.style.display = "flex"
	span.style.flexDirection = "column"
	span.style.justifyContent = "center"
	span.style.height = "100%"
	if (lvlpacks.length > 0) {
		span.innerHTML = "Saved Packs<span><hr></span>"
		let btnspan = document.createElement("span")
		btnspan.style.flex = "1"
		btnspan.style.overflow = "auto"
		btnspan.style.display = "flex"
		btnspan.style.flexDirection = "column"
		lvlpacks.forEach((e,i)=>{
			let btnswrap = document.createElement("span")
			btnswrap.style.display = "flex"
			btnswrap.style.gap = "5px"
			
			let btn = document.createElement("button")
			btn.className = "flexbtn"
			btn.style.flex = "1"
			let namespan = document.createElement("span")
			namespan.innerText = `(${i+1}) `+e.split(/\r?\n/gm)[3]
			btn.appendChild(namespan)
			btnswrap.appendChild(btn)
			
			let delbtn = document.createElement("button")
			delbtn.className = "square"
			delbtn.innerText = "×"
			btnswrap.appendChild(delbtn)
			
			btn.onclick = ()=>{
				loadLevels(e)
				saveid = i
				span.remove()
				canvas.style.display = "inline-block"
			}

			delbtn.onclick = ()=>{
				if (confirm("Are you sure you want to delete this levelpack?")) {
					lvlpacks.splice(i, 1)
					localStorage.lvlpacks = JSON.stringify(lvlpacks)
					load.onclick()
				}
			}
			
			btnspan.appendChild(btnswrap)
		})
		span.appendChild(btnspan)
	} else
		span.innerHTML = "No Saved Packs<span><br></span>"
	let btmbtns = document.createElement("span")
	btmbtns.style.display = "flex"
	btmbtns.style.marginLeft = "100px"
	btmbtns.style.marginRight = "100px"
	btmbtns.style.justifyContent = "fill"
	let newbtn = document.createElement("button")
	newbtn.innerText = "Create new..."
	newbtn.style.flex = 1
	btmbtns.appendChild(newbtn)
	newbtn.onclick = ()=>{
		loadLevels('{"0,0":{}}\n0\n0\nUntitled')
		saveid = -1
		span.remove()
		canvas.style.display = "inline-block"
	}
	let cancelbtn = document.createElement("button")
	cancelbtn.innerText = "Cancel"
	cancelbtn.style.flex = 1
	btmbtns.appendChild(cancelbtn)
	cancelbtn.onclick = ()=>{
		span.remove()
		canvas.style.display = "inline-block"
	}
	span.appendChild(btmbtns)
	document.getElementById("main").appendChild(span)
}

let help = document.getElementById("help")

help.onclick = ()=>{
	msg(
`Select a tile from the upper right panel
On the far right you can see the total tiles
Place a tile by left clicking on the upper left panel
The lower right panel shows a preview of the level
The lower left shows what layer you are on, and you can click on the 3x3 grid to switch sections in the level

Press TAB to switch layers
Use WASD to switch tiles
Use SHIFT + WASD to switch level segments
Hold E to activate the eraser
Ctrl+Click to set player spawn position (only in 0,0)

Export downloads the current map
Import loads a map from your computer
Press Save to save a map
Press Load to load a map
Use the dropdown to switch levels
Press + to add a new level and × to delete the current one
Press Dialogue to set npc dialogue`
	)
}

let canvas
let span

function msg(msg) {
	canvas.style.display = "none"
	if (span) span.remove()
	span = document.createElement("span")
	span.style.display = "flex"
	span.style.flexDirection = "column"
	span.style.justifyContent = "center"
	span.style.height = "100%"
	span.innerText = msg
	span.innerHTML += "<br><br>"
	let closebtn = document.createElement("button")
	closebtn.style.marginLeft = "200px"
	closebtn.style.marginRight = "200px"
	closebtn.innerText = "Ok"
	span.appendChild(closebtn)
	closebtn.onclick = ()=>{
		span.remove()
		canvas.style.display = "inline-block"
	}
	document.getElementById("main").appendChild(span)
}

function setup() {
	document.getElementById("main").appendChild(canvas = createCanvas(544, 480).elt)
	dcode = document.createElement("pre")
	dcode.style.whiteSpace = "pre-wrap"
	document.getElementById("editor").appendChild(dcode)
	dcode.innerText = "No NPC hovered"
	dcode.style.userSelect = "all"
	dcode.className = "inp"
	dcode.style.width = "100%"
	dcode.style.marginBottom = "0px"
	ctx = drawingContext
	diabutt = createButton('Dialogue');
	document.getElementById("btnrow").appendChild(diabutt.elt)
	diabutt.mouseReleased(()=>{
		let tempdata = prompt(`Please input dialogue data.
Each line of dialogue must be separated by a pipe |
New lines must be specified by \\n`,dialoguedata)
		if (!tempdata) return
		dialoguedata = tempdata
		dialogue = JSON.stringify(dialoguedata.replace(/\\n/gm,"\n").split("|"))
	});
}

dialoguedata = ""
dialogue = '[]'
levels = {
	"0,0": {}
}
levelpack = [
	levels,
	0,
	0,
]
tilepage = 0
level = levels["0,0"]
settile = 1
setnpc = 0
theme = "grassy"
themes = ["grassy"]
sx = 0
sy = 0
layer = 1

let fileHandle

download = document.getElementById("download")
download.onclick = async()=>{
	let data = JSON.stringify(levels)+`
${levelpack[1]}
${levelpack[2]}
${levelPackName.value}`
	if (!fileHandle) downloadStr(data, levelPackName.value+".lvls")
	else { // use the fancy api
		try {
			download.disabled = true
			// Create a file stream to write to.
			const writable = await fileHandle.createWritable();
			// Write the contents of the file to the stream.
			await writable.write(data);
			// Close the file and write the contents to disk.
			await writable.close();
			msg("Save complete!")
			download.disabled = false
		} catch (e) {
			download.disabled = false
			downloadStr(data, levelPackName.value+".lvls")
		}
	}
}

open = document.getElementById("open")
open.onclick = async()=>{
	[fileHandle] = await showOpenFilePicker()
	const file = await fileHandle.getFile();
	const contents = await file.text();
	levelpack = contents.split(/\r?\n/gm)
	levelpack[0] = JSON.parse(levelpack[0])
	levelpack[1] = parseInt(levelpack[1])
	levelpack[2] = parseInt(levelpack[2])
	levelPackName.value = levelpack[3]
	levels = levelpack[0]
	levelselect.innerHTML = ""
	Object.keys(levels).forEach(name=>{
		var option = document.createElement("option");
		option.text = name;
		option.value = name;
		levelselect.add(option)
	})
	levelselect.value = Object.keys(levels)[0]
	level = levels[levelselect.value]
	settile = 1
	theme = "grassy"
	sx = 0
	sy = 0
}

levelPackName = document.getElementById("lpn")
levelPackName.oninput = () => levelpack[3] = levelPackName.value

function loadLevels(lvlFile) {
	levelpack = lvlFile.split(/\r?\n/gm)
	levelpack[0] = JSON.parse(levelpack[0])
	levelpack[1] = parseInt(levelpack[1])
	levelpack[2] = parseInt(levelpack[2])
	levelPackName.value = levelpack[3]
	levels = levelpack[0]
	levelselect.innerHTML = ""
	Object.keys(levels).forEach(name=>{
		var option = document.createElement("option");
		option.text = name;
		option.value = name;
		levelselect.add(option)
	})
	levelselect.value = Object.keys(levels)[0]
	level = levels[levelselect.value]
	settile = 1
	theme = "grassy"
	sx = 0
	sy = 0
}

levelselect = document.getElementById("levels")
levelselect.onchange = ()=>{
	level = levels[levelselect.value]
}

add = document.getElementById("add")
add.onclick = ()=>{
	let name = prompt("Level position")
	if (!name) return
	if (levels[name]) return msg("Level already exists!")
	level = levels[name] = {}
	var option = document.createElement("option");
	option.text = name;
	option.value = name;
	levelselect.add(option)
	levelselect.value = name
}
removebtn = document.getElementById("remove")
removebtn.onclick = ()=>{
	if (levelselect.value != "0,0" && confirm("Are you sure you want to remove this level?")) {
		delete levels[levelselect.value]
		levelselect.remove(levelselect.selectedIndex)
		levelselect.value = Object.keys(levels)[0]
		level = levels[levelselect.value]
	} else if (levelselect.value == "0,0") {
		msg("You cannot remove the starting level")
	}
}

function downloadObj(exportObj, exportName){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function downloadStr(exportStr, exportName){
    var dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(exportStr);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function getTileP(x, y, prefix) {
	return (prefix ? prefix+"_" : "") + (Math.floor(x/8)+sx*10) + "," + (Math.floor(y/8)+sy*10)
}

function getTileP2(x, y) {
	return Math.floor(x/10) + Math.floor(y/10+tilepage)*8-8
}

function getTileP3(x, y) {
	return Math.floor(x/10) + Math.floor(y/10)*8-8
}

function draw() {
	clear();
	noSmooth();
	delete level["seg"+sx+sy]
	for (let y = 0; y < 10; y++) 
	for (let x = 0; x < 10; x++) {
		scale(3);
		if (layer == 1)
			ctx.globalAlpha = 1
		else
			ctx.globalAlpha = 0.35
		if (typeof level[x+sx*10+','+(y+sy*10)] == "number") {
			level["seg"+sx+sy] = true
			let tile = level[x+sx*10+','+(y+sy*10)];
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(tilesets.grassy, x*8, y*8, 8, 8, tilex, tiley, 8, 8);
			image(grassy_outline, x*8, y*8, 8, 8, tilex, tiley, 8, 8);
		}
		if (layer == 0)
			ctx.globalAlpha = 1
		else
			ctx.globalAlpha = 0.35
		if (typeof level["fg_"+(x+sx*10)+','+(y+sy*10)] == "number") {
			level["seg"+sx+sy] = true
			let tile = level["fg_"+(x+sx*10)+','+(y+sy*10)];
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(tilesets.grassy, x*8, y*8, 8, 8, tilex, tiley, 8, 8);
			image(grassy_outline, x*8, y*8, 8, 8, tilex, tiley, 8, 8);
		}
		if (layer == 2)
			ctx.globalAlpha = 1
		else
			ctx.globalAlpha = 0.35
		if (level["npc_"+(x+sx*10)+','+(y+sy*10)]) {
			level["seg"+sx+sy] = true
			let npc = level["npc_"+(x+sx*10)+','+(y+sy*10)];
			let tile = npc.sprite
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(npcs, x*8, y*8, 8, 8, tilex, tiley, 8, 8);
		}
		ctx.globalAlpha = 1
		if (levelselect.value == "0,0" &&
			levelpack[1] < sx*10+10 && levelpack[1] >= sx*10 &&
			levelpack[2] < sy*10+10 && levelpack[2] >= sy*10) {
			image(startpos, (levelpack[1]%10)*8, (levelpack[2]%10)*8)
		}
		scale(1/3);
		fill("#00000000")
		stroke("#00000033")
		rect(x*24, y*24, 24, 24)
	}
	fill("#00000000")
	stroke("#00000033")
	rect(0, 0, 240, 240)
	if (mouseX < 240 && mouseX >= 0 && mouseY < 240 && mouseY >= 0) {
		if (mouseIsPressed) {
			if (keyIsDown(69)) {
				if (keyIsDown(CONTROL)) {
					if (levelselect.value == "0,0") {
						let pos = getTileP(mouseX/3, mouseY/3).split(",")
						levelpack[1] = pos[0]
						levelpack[2] = pos[1]
					}
				} else if (layer == 0)
					delete level[getTileP(mouseX/3, mouseY/3, "fg")]
				else if (layer == 1)
					delete level[getTileP(mouseX/3, mouseY/3)]
				else if (layer == 2)
					delete level[getTileP(mouseX/3, mouseY/3, "npc")]
			} else {
				if (keyIsDown(CONTROL)) {
					if (levelselect.value = "0,0") {
						let pos = getTileP(mouseX/3, mouseY/3).split(",")
						levelpack[1] = pos[0]
						levelpack[2] = pos[1]
					}
				} else if (layer == 0)
					level[getTileP(mouseX/3, mouseY/3, "fg")] = settile
				else if (layer == 1)
					level[getTileP(mouseX/3, mouseY/3)] = settile
				else if (layer == 2)
					level[getTileP(mouseX/3, mouseY/3, "npc")] = {
						sprite: setnpc,
						text: JSON.parse(dialogue),
						index: 0,
					}
			}
		}
		if (level[getTileP(mouseX/3, mouseY/3, "npc")])
			dcode.innerText = level[getTileP(mouseX/3, mouseY/3, "npc")].text.join("|").replaceAll("\n","\\n")
	}
	if (layer == 2) {
		for (let y = 0; y < 8; y++) 
		for (let x = 0; x < 8; x++) {
			// tile select
			fill("#ffffff");
			stroke("#000000");
			if (x+y*8 == setnpc) rect(240+x*30, y*30, 30, 30);
			scale(3);
			image(npcs, 81+x*10, 1+y*10, 8, 8, x*8, y*8, 8, 8);
			scale(1/3);
		}
	} else {
		for (let y = 0; y < 8; y++) 
		for (let x = 0; x < 8; x++) {
			// tile select
			fill("#ffffff");
			stroke("#000000");
			if (x+(y+tilepage)*8 == settile) rect(240+x*30, (y)*30, 30, 30);
			scale(3);
			image(tilesets[theme], 81+x*10, 1+y*10, 8, 8, x*8, (y+tilepage)*8, 8, 8);
			scale(1/3);
		}
	}
	fill("#00000000")
	stroke("#00000033")
	rect(240, 0, 240, 240)
	
	for (let y = 0; y < 3; y++) 
	for (let x = 0; x < 3; x++) {
		// fill transparent if empty section
		// fill ffffff if contains tiles
		// fill 29ADFF if selected
		if (sx == x && sy == y) 
			fill("#29ADFF")
		else if (level["seg"+x+y])
			fill("#ffffff")
		else
			fill("#00000000")
		stroke("#000000")
		rect(12 + x*30, 252+y*30, 24, 24)
	}
	fill("#fff")
	stroke("#0000")
	text(settile.toString(), 240, 10)
	text('Press [Tab]', 120, 260);
	if (layer == 1)
		stroke("#fff")
	else
		stroke("#0000")
	text('BG Layer', 120, 280);
	if (layer == 0)
		stroke("#fff")
	else
		stroke("#0000")
	text('FG Layer', 120, 300);
	if (layer == 2)
		stroke("#fff")
	else
		stroke("#0000")
	text('NPC Layer', 120, 320);
	stroke("#00000033")
	fill("#29ADFF")
	rect(240, 240, 240, 240)
	fill("#00000000")
	image(tilesets[theme], 480, 0)
	stroke("#00000077")
	rect(480, tilepage*8, 64, 64)
	rect(240+sx*80, 240+sy*80, 80, 80)
	stroke("#00000000")
	fill("#00000088")
	rect(480, 0, 64, tilepage*8)
	rect(480, 64+tilepage*8, 64, 480-tilepage*8)
	for (let y = 0; y < 30; y++) 
	for (let x = 0; x < 30; x++) {
		if (typeof level[x+','+y] == "number") {
			let tile = level[x+','+y];
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(tilesets[theme], 240+x*8, 240+y*8, 8, 8, tilex, tiley, 8, 8);
		}
		if (level["npc_"+x+','+y]) {
			let npc = level["npc_"+x+','+y];
			let tile = npc.sprite;
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(npcs, 240+x*8, 240+y*8, 8, 8, tilex, tiley, 8, 8);
		}
		if (typeof level["fg_"+x+','+y] == "number") {
			let tile = level["fg_"+x+','+y];
			let tilex = (tile%8)*8;
			let tiley = tile - tile%8;
			// actual tile
			image(tilesets[theme], 240+x*8, 240+y*8, 8, 8, tilex, tiley, 8, 8);
		}
	}
}

function mousePressed() {
	if (mouseX >= 240 && mouseX < 480 && mouseY < 240 && mouseY >= 0) {
		if (layer == 2) {
			setnpc = getTileP3(mouseX/3, mouseY/3)
		} else {
			settile = getTileP2(mouseX/3, mouseY/3)
		}
	}
	if (mouseX < 99 && mouseX >= 9 && mouseY < 339 && mouseY >= 249) {
		sx = Math.floor((mouseX-9)/30)
		sy = Math.floor((mouseY-249)/30)
	}
}

function keyPressed() {
	if (keyIsDown(SHIFT)) {
		if (keyCode == 65)
			sx--
		if (keyCode == 68)
			sx++
		if (keyCode == 87)
			sy--
		if (keyCode == 83)
			sy++
		if (sx < 0) sx = 2
		if (sx > 2) sx = 0
		if (sy < 0) sy = 2
		if (sy > 2) sy = 0
		if (keyCode == 9)
			layer = (layer+1)%3
	} else {
		if (keyCode == 65)
			settile--
		if (keyCode == 68)
			settile++
		if (keyCode == 87)
			settile-=8
		if (keyCode == 83)
			settile+=8
		if (settile < 0) settile = 0
		if (settile > (maxtilepage+8)*8-1) settile = (maxtilepage+8)*8-1
		if (keyCode == 9)
			if (--layer < 0) layer += 3
	}
}
function mouseWheel(event) {
	if (event.delta > 0)
		tilepage++
	else
		tilepage--
	if (tilepage < 0)
		tilepage = 0
	if (tilepage > maxtilepage)
		tilepage = maxtilepage
}
document.addEventListener("keydown", e=>{
	if (e.code == "Tab")
	e.preventDefault()
})
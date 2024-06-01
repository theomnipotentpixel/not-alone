// happen once on page load
let defaultlevels
let builtins
let gamewin = document.getElementById("gamewin");

let peer = new Peer();
let conn = false;

let editorData = {
	f: 4
}

let settings = {
	swapJumpAndTalk: false,
}

let button_npcTalk = 38;
let button_jump = 32;

window.switchSpaceAndUp = function(){
	settings.swapJumpAndTalk = !settings.swapJumpAndTalk
}

if (!localStorage.lvlpacks) localStorage.lvlpacks = '[]'
let lvlpacks = JSON.parse(localStorage.lvlpacks)

// multiplayer shiz
peer.on('open', function(id) {
	console.log('My peer ID is: ' + id);
});
peer.on('connection', (conn) => {
	if (game.onconnection) game.onconnection(conn)
	else conn.close()
})
peer.on("error", err => {
	if (game.onconnerror) game.onconnerror(err)
})
peer.on("disconnected", e => {
	peer.reconnect()
})

let VERSION = 0.4
let PATCH = 0
if (ISDEVSERVER) {
	VERSION += 999
}
if (localStorage.lastver == undefined)
	localStorage.lastver = VERSION * 100 + PATCH
// version checking before joining room
// ignore PATCH
// major update x.0.0 - adds lots of content
// minor update 0.x.0 - adds little content
// patch update 0.0.x - just bugfix, no content/packet change
// patch update might also add something that overall doesnt
// change the ability for clients to connect, ie a new sfx
// that doesnt change packet info, or some client side only
// thing
// major and minor change something about the game, meaning
// outdated clients cant connect to up-to-date hosts
const VERSION_str = VERSION.toFixed(1) + "." + PATCH

class SFX {
	constructor(url) {
		this.audio = new Audio(url)
	}

	play() {
		try {
			this.audio.currentTime = 0;
			this.audio.play()
		} catch (e) { }
	}
}

class Music {
	constructor(...urls) {
		this.audio = urls.map(url => new Audio(url))
		this.currentplaying = null
	}

	play() {
		try {
			if (this.currentplaying) this.currentplaying.pause()
			let current = this.audio[Math.floor(Math.random() * this.audio.length)];
			current.currentTime = 0;
			current.play()
			current.volume = 1
			if (!current.paused) {
				this.currentplaying = current
				this.currentplaying.onended = () => {
					this.currentplaying = null
				}
			}
		} catch (e) {
			console.warn(e)
		}
	}

	loop() {
		try {
			if (this.currentplaying) this.currentplaying.pause()
			let current = this.audio[Math.floor(Math.random() * this.audio.length)];
			current.currentTime = 0;
			current.play()
			current.volume = 1
			current.loop = true
			if (!current.paused) this.currentplaying = current
		} catch (e) {
			console.warn(e)
		}
	}

	stop() {
		try {
			this.currentplaying.pause()
			this.currentplaying = null
		} catch (e) {
			console.warn(e)
		}
	}
}

const sfx = {};

// import sounds
sfx.jump = new SFX('sounds/jump.wav');
sfx.land = new SFX('sounds/land.wav');
sfx.signal = new SFX('sounds/signal.wav');
sfx.win = new SFX('sounds/sunglasses.wav');
sfx.select = new SFX('sounds/select.wav');
sfx.coin = new SFX('sounds/coin.wav');
sfx.bounce = new SFX('sounds/trampoline.wav');
sfx.fly = new SFX('sounds/jetpack.wav');
sfx.getjp = new SFX('sounds/getjp.wav');
sfx.losejp = new SFX('sounds/losejp.wav');
sfx.unlock = new SFX('sounds/unlock.wav');
sfx.key = new SFX('sounds/key.wav');
sfx.boing = new SFX('sounds/bounce.wav');

const music = {}
window.music = music

// import background music
music.grass = new Music("sounds/not_alone_grass_1.mp3");
music.cave = new Music("sounds/not_alone_cave_1.mp3");
music.night = new Music("sounds/not_alone_night_1.mp3");
music.space = new Music("sounds/not_alone_space_1.mp3");
music.lobby = new Music("sounds/not_alone_lobby_select.mp3");
music.sunglasses = new Music("sounds/not_alone_sunglasses.mp3");

let game = {}
let host = false;

let player_img;
let mptooltip;
let mpsignals;
let sky;
let npcs;
let tilesets = {};
let jetpack;

let currentMusicLevel = 1;
let currentSFXLevel = 1;

let errtitle = "New Update: " + VERSION.toFixed(1) + `.${PATCH}!`;
let errmsg =
	`- Added Background Music!

- Added Volume Controls in the Settings Menu!`;
let showerr = true;
if (parseFloat(localStorage.lastver) != VERSION * 100 + PATCH)
	localStorage.lastver = VERSION * 100 + PATCH
else
	errmsg = false


let connectid = "";
const htpDefault = `You can use WASD or arrow keys to move around
Press SPACE to jump

Hold SHIFT or E to view the list of signals and emojis you can send

Pressing 0-9 on your keyboard will send the corresponding signal`;

// main game code
// p5 functions are no longer global space and
// must now start with p.
// ex: p.loadImage("fuqer.png");

let quitting = false

const g = p => {

	if (conn) {
		conn.close()
		conn = false
	}

	quitting = false

	let currentmusictrack

	p.quit = function() {
		if (host) {
			fetch("https://ns.jrtech.me/flatline/" + peer.id)
				.then(res => res.text())
			for (const [id, client] of Object.entries(clients)) {
				if (client.close) client.close()
			}
		}
		p.remove()
		if (!quitting) game = new p5(m, gamewin)
		quitting = true
		clearInterval(movepacketinterval)
		clearInterval(heartbeat)
		if (currentmusictrack) currentmusictrack.stop()
	}

	let animtimer = 0;
	// perpetual anim timer (other stops at 5)
	let panimtimer = 0;

	let levels;

	let currentLevelPack;
	let blinkon = 0;
	let moved = false;
	let paused = false;
	let howtoplay = htpDefault;
	let bottomtext = "";
	let bottomtexttime = 0;
	let bigtext = "";
	let bigtexttime = 0;
	let dev = false;
	let upload = (file) => { };
	let fileinp = p.createFileInput(file => {
		if (upload) upload(file)
	});
	let levelPackName = "Default";

	fileinp.hide();

	function updateScreen(y = 0, x = 0) {
		if (!levels[(currentLevelX + x) + "," + (currentLevelY + y)])
			return false;
		currentLevelX += x;
		currentLevelY += y;
		for (let i = 0; i < signals.length; i++) {
			signals[i].x -= x * 240
			signals[i].y -= y * 240
			signals[i].fy -= y * 240
		}
		mpClients = {};
		return true;
	}

	let heartbeat;

	let clients = {};

	function broadcast(obj) {
		if (host) for (const [id, client] of Object.entries(clients)) {
			client.send(JSON.stringify(obj))
		}
	}

	let heartbeatfunc = () => {
		fetch("https://ns.jrtech.me/heartbeat/" + peer.id + "/" + host + "/" + VERSION + "/" + PATCH)
			.then(res => res.text())
	}

	function connect() {
		howtoplay = htpDefault;
		mpClients = {}
		if (host) {
			clients = {
				1: initConn({
					send: (data) => {
						message(JSON.parse(data))
					},
					peer: 1
				})
			}
			heartbeat = setInterval(heartbeatfunc, 25000)
			heartbeatfunc()
			bottomtext = `Hosting Room "${host}"...`;
			bottomtexttime = Date.now() + 3000;
			// copied directly from server code
			// client 1 is always you

			function initConn(conn) {
				conn.id = conn.peer
				console.log("connection from " + conn.id)
				conn.lastsignal = 0
				conn.broadcast = (obj) => {
					for (const [id, client] of Object.entries(clients)) {
						if (conn.id != id) client.send(JSON.stringify(obj))
					}
				}
				clients[conn.id] = conn
				return conn
			}

			p.onconnection = function(conn) {
				initConn(conn)
				conn.on("open", () => {
					if (currentLevelPack) {
						console.log(currentLevelPack)
						conn.send(JSON.stringify({
							type: "levelpack",
							levelpack: currentLevelPack
						}))
					}
					let players = Object.keys(clients).length
					broadcast({
						type: "msg",
						msg: players + " online",
						time: 3000,
						id: 0,
					})
				})
				conn.on('data', (data) => {
					servermessage(data, conn)
				})
				conn.on('close', () => {
					console.log("disconnection from " + conn.id)
					conn.broadcast({
						type: "remove",
						id: conn.id,
					})
					delete clients[conn.id]
					let players = Object.keys(clients).length
					broadcast({
						type: "msg",
						msg: players + " online",
						time: 3000,
						id: 0,
					})
				})
			}
		} else if (connectid) {
			bottomtext = "Connecting...";
			bottomtexttime = Date.now() + 3000;
			conn = peer.connect(connectid)
			conn.on("close", () => {
				// quit to title with message
				errtitle = "Disconnected"
				errmsg = "You were disconnected from the host"
				p.quit()
				//game = new p5(m, gamewin)
			})
			conn.on("data", (data) => {
				message(JSON.parse(data))
			})
		}
		p.onconnerror = err => {
			let errmsgs = {
				"browser-incompatible": "Your browser is not compatible with this game. Please use a browser that supports WebRTC.",
				disconnected: "Unable to connect.",
				network: "Disconnected from signalling server.",
				"peer-unavailable": "The room you are trying to join is no longer being hosted."
			}
			if (err.type == "network") {
				bottomtext = "Error: Disconnected from signalling server.\nYour room will be inaccessible until you reconnect.";
				bottomtexttime = Date.now() + 5000;
			} else {
				errtitle = "Uh oh!"
				errmsg = "Error: " + err.type + (errmsgs[err.type] ? ": " + errmsgs[err.type] : "")
				p.quit()
			}
		}
		// disable ws connections but keep code temporarily
		return
		// close previous connection
		if (connected) {
			ws.close();
			connected = false;
		}
		bottomtext = "Connecting...";
		howtoplay = htpDefault;
		bottomtexttime = Date.now() + 3000;

		let url = "wss://gamejam-server.thedt365.repl.co"

		if (window.location.hash)
			url = window.location.hash.replace("#", "")
		// wake up repl
		fetch(url.replace(/^ws/, "http"), {
			cache: 'no-cache',
			mode: 'no-cors'
		});
		// try connect
		ws = new WebSocket(url.replace(/^http/, "ws"));
		ws.onerror = () => {
			mpClients = {}
			connected = false;
			bottomtext = "An error occured";
			howtoplay = htpDefault;
			bottomtexttime = Date.now() + 3000;
		}
		ws.onclose = () => {
			mpClients = {}
			connected = false;
			bottomtext = "Disconnected";
			howtoplay = htpDefault;
			bottomtexttime = Date.now() + 3000;
			setTimeout(connect, 1000);
		}
		ws.onopen = () => {
			mpClients = {}
			connected = true;
			bottomtext = "";
		}
		ws.onmessage = (event) => {
			try {
				message(JSON.parse(event.data.toString()))
			} catch (e) {
				console.error(e.stack)
			}
		}
	}

	let mpClients = {};

	function message(packet) {
		let id = packet.id
		if (packet.type == "move") {
			// if in same room, treat like normal
			if (packet.rx == currentLevelX && packet.ry == currentLevelY) {
				// if player does not exist, make it exist
				if (!mpClients[id])
					mpClients[id] = new Player(packet.x, packet.y, id)

				// set properties
				mpClients[id].x = packet.x
				mpClients[id].y = packet.y
				mpClients[id].dx = packet.dx
				mpClients[id].dy = packet.dy
				mpClients[id].left = packet.left
				mpClients[id].right = packet.right
				mpClients[id].jump = packet.jump
				mpClients[id].down = packet.down
				mpClients[id].sunglasses = packet.sg
				mpClients[id].jetpack = packet.jp
			} else {
				delete mpClients[id]
			}
		}
		if (packet.type == "setpos") {
			player.x = packet.x
			player.y = packet.y
			currentLevelX = packet.rx
			currentLevelY = packet.ry
		}
		if (packet.type == "setvel") {
			player.dx = packet.dx
			player.dy = packet.dy
		}
		if (packet.type == "remove") {
			delete mpClients[id]
		}
		if (packet.type == "msg") {
			bottomtext = packet.msg;
			packet.time = packet.time || 0;
			if (packet.time > 0)
				bottomtexttime = Date.now() + packet.time + 2000;
			else
				bottomtexttime = 0;
		}
		if (packet.type == "bigmsg") {
			bigtext = packet.msg;
			packet.time = packet.time || 0;
			if (packet.time > 0)
				bigtexttime = Date.now() + packet.time + 2000;
			else
				bigtexttime = 0;
		}
		if (packet.type == "motd") {
			htpdiv.elt.innerText = packet.msg;
		}
		if (packet.type == "signal") {
			if (mpClients[id])
				signals.push(new MPSignal(mpClients[id], packet.sprite))
		}
		if (packet.type == "levelpack") {
			console.log("levelpack")
			loadLevels(packet.levelpack)
		}
	}

	function servermessage(msg, conn) {
		if (!conn) conn = clients[1]
		if (!conn) return
		const text = msg.toString()
		let packet
		try {
			packet = JSON.parse(text)
			if (packet.type == "move") {
				conn.broadcast({
					type: "move",
					x: packet.x,
					y: packet.y,
					dx: packet.dx,
					dy: packet.dy,
					rx: packet.rx,
					ry: packet.ry,
					jump: packet.jump,
					down: packet.down,
					left: packet.left,
					right: packet.right,
					sg: packet.sg,
					jp: packet.jp,
					id: conn.id,
				})
			} else if (packet.type == "signal") {
				if (conn.lastsignal + 100 < Date.now()) {
					conn.lastsignal = Date.now()
					conn.broadcast({
						type: "signal",
						sprite: packet.sprite,
						id: conn.id,
					})
				}
			}
		} catch (e) {
			return console.error(e)
		}
	}

	function send(packet) {
		// check if open
		if (conn && conn.open) {
			conn.send(JSON.stringify(packet))
			return true
		} else if (host) {
			servermessage(JSON.stringify(packet))
		}
		return false
	}

	function keyUnlock(x, y, pref) {
		x = parseInt(x)
		y = parseInt(y)
		player.unlocked = true
		let level = levels[currentLevelX+","+currentLevelY]
		let prefix = (typeof pref == "string" ? pref+"_" : "")
		// console.log("Key block at "+prefix+x+","+y+": ",level[prefix+(x)+","+(y)], "level: ", level)
		delete level[prefix+x+","+y]
		if (level[prefix+(x+1)+","+(y)] == 231)
			keyUnlock(x+1, y, pref)
		if (level[prefix+(x-1)+","+(y)] == 231)
			keyUnlock(x-1, y, pref)
		if (level[prefix+(x)+","+(y+1)] == 231)
			keyUnlock(x, y+1, pref)
		if (level[prefix+(x)+","+(y-1)] == 231)
			keyUnlock(x, y-1, pref)
	}

	const Player = function(x, y, control = false) {
		this.x = x;
		this.y = y;
		this.dx = 0;
		this.cx = 0;
		this.dy = 0;
		this.frame = 0;
		this.walkframe = 0;
		this.mirror = false;
		this.sunglasses = false;
		this.acceleration = 0.75;
		this.deceleration = 0.5;
		this.speedcap = 4.5;
		this.gravity = 0.5;
		this.jumpheight = -8;
		this.control = control;
		this.jump = false;
		this.left = false;
		this.right = false;
		this.down = false;
		this.drawx = x;
		this.drawy = y;
		this.jetpack = false;
		this.keys = [];
		this.draw = function() {
			if (this.control) {
				// interpolate
				this.drawx += (this.x - this.drawx) / 3
				this.drawy += (this.y - this.drawy) / 3
			} else {
				this.drawx = this.x
				this.drawy = this.y
			}
			// display keys player has
			for (let i = 0; i < this.keys.length; i++) {
				let key = this.keys[i]
				let snappos = this.keys[i-1] || {x: this.x, y: this.y}
				let dist = Math.sqrt(Math.pow(snappos.x-key.x,2)+Math.pow(snappos.y-key.y,2))
				if (dist > 8) {
					key.x += (snappos.x - key.x) / 10
					key.y += (snappos.y - key.y) / 10
				}
				p.image(tilesets.grassy, key.x-4, key.y-4 + 1.5*Math.sin(panimtimer/30+i*2), 8, 8, 48, 224, 8, 8)
			}
			if (this.jetpack) {
				if (!this.mirror) {
					p.image(jetpack, this.drawx + 2, this.drawy - 3, 3, 6, 0, 0, 3, 6)
					if (this.jump) p.image(jetpack, this.drawx + 2, this.drawy + 3, 3, 2 + Math.random() * 4, 0, 6, 3, 2)
				}
				else {
					p.image(jetpack, this.drawx - 5, this.drawy - 3, 3, 6, 3, 0, 3, 6)
					if (this.jump) p.image(jetpack, this.drawx - 5, this.drawy + 3, 3, 2 + Math.random() * 4, 0, 6, 3, 2)
				}
			}
			p.image(player_img, this.drawx - 4, this.drawy - 4, 8, 8, this.frame * 8, this.mirror * 8 + this.sunglasses * 16, 8, 8)
			// hitbox
			// p.rect((this.x-4), (this.y-4), 8, 8); // literally square
		}
		this.update = function() {
			this.unlocked = false
			if (!this.control) {
				if (this.y <= 0) {
					if (updateScreen(-1)) {
						this.y += 240;
						for (let i = 0; i < this.keys.length; i++)
							this.keys[i].y += 240
					}
				}
				if (this.y >= 240) {
					if (updateScreen(1)) {
						this.y -= 240;
						for (let i = 0; i < this.keys.length; i++)
							this.keys[i].y -= 240
					}
				}
				if (this.x <= 0) {
					if (updateScreen(0, -1)) {
						this.x += 240;
						for (let i = 0; i < this.keys.length; i++)
							this.keys[i].x += 240
					}
				}
				if (this.x >= 240) {
					if (updateScreen(0, 1)) {
						this.x -= 240;
						for (let i = 0; i < this.keys.length; i++)
							this.keys[i].x -= 240
					}
				}
			}
			if (!this.control) this.left = (p.keyIsDown(65) || p.keyIsDown(p.LEFT_ARROW)) && !paused
			if (!this.control) this.right = (p.keyIsDown(68) || p.keyIsDown(p.RIGHT_ARROW)) && !paused
			if (this.left) {
				// if not over the speed cap, accelerate
				if (this.dx > -this.speedcap)
					this.dx -= this.acceleration / (this.ice ? 4 : 1);
			} else if (this.right) {
				// if not over the speed cap, accelerate
				if (this.dx < this.speedcap)
					this.dx += this.acceleration / (this.ice ? 4 : 1);
			} else {
				// if speed is less than deceleration, set to 0
				// prevents weird back and forth movement
				if (Math.abs(this.dx) < this.deceleration) {
					this.dx = 0;
				}
				// decelerate
				if (!this.ice) if (this.dx > 0) {
					this.dx -= this.deceleration;
				} else if (this.dx < 0) {
					this.dx += this.deceleration;
				}
			}
			this.ice = false
			// this.tryCollide(true);
			/*
			this.x += this.dx;
			this.y += this.dy;
			*/
			if (this.dy > 0)
				this.frame = 1
			else
				this.frame = 3
			if (!this.control) this.down = (p.keyIsDown(83) || p.keyIsDown(p.DOWN_ARROW)) && !paused
			if (!this.control) this.jump = (settings.swapJumpAndTalk ? (p.keyIsDown(87) || p.keyIsDown(button_npcTalk)) : p.keyIsDown(button_jump)) && !paused
			this.x += this.cx
			this.cx = 0
			if (this.jump && this.jetpack)
				this.dy -= 0.75
			for (let i = 0; i < 4; i++) {
				this.y += this.dy / 6
				let vcol = (prefix) => {
					if (this.dy > 0) {
						let left = getTile(this.x - 2, this.y + 4, prefix)
						let right = getTile(this.x + 2, this.y + 4, prefix)
						let leftp = getTileP(this.x - 2, this.y + 4, prefix)
						let rightp = getTileP(this.x + 2, this.y + 4, prefix)
						if ((solids.includes(left) || solids.includes(right)) ||
							((semisolid.includes(left) || semisolid.includes(right)) &&
								getTileP(this.x, this.y + 4) != getTileP(this.x, this.y + 4 - this.dy) &&
								!(this.down))) {
							if (left == 167 || right == 167) {
								this.dy = -Math.abs(this.dy) + 1
								sfx.bounce.play();
							} else if (!this.control && right == 227 && this.dy > 0.5) {
								delete levels[currentLevelX + "," + currentLevelY][rightp]
								this.dy = -5
							} else if (!this.control && left == 227 && this.dy > 0.5) {
								delete levels[currentLevelX + "," + currentLevelY][leftp]
								this.dy = -5
							} else {
								if (icy.includes(left) || icy.includes(right))
									this.ice = true
								if (conv[left])
									this.cx += conv[left]
								if (conv[right])
									this.cx += conv[right]
								if (this.dy > 15)
									if (!this.control) sfx.land.play();
								this.y = Math.round(this.y / 8) * 8 - 4
								this.dy = yvbounce[left] || yvbounce[right] || 0
								if (this.dx == 0)
									this.frame = 0
								else
									this.frame = [1, 0, 2, 0][this.walkframe % 4]
								if (yvbounce[left] || yvbounce[right]) {
									sfx.boing.play()
								} else if (this.jump && !this.jetpack) {
									this.dy = this.jumpheight;
									try {
										if (!this.control) sfx.jump.play();
									} catch (e) { }
								}
							}
							let leftpos = getTileP(this.x - 2, this.y + 4).split(",")
							let rightpos = getTileP(this.x + 2, this.y + 4).split(",")
							if (left == 231 && this.keys.length > 0) keyUnlock(leftpos[0], leftpos[1], prefix)
							if (right == 231 && this.keys.length > 0) keyUnlock(rightpos[0], rightpos[1], prefix)
							if (player.unlocked) {
								sfx.unlock.play()
								player.keys.pop()
								player.unlocked = false
							}
						}
					}
					if (this.dy < 0) {
						let left = getTile(this.x - 2, this.y - 4, prefix)
						let right = getTile(this.x + 2, this.y - 4, prefix)
						let leftpos = getTileP(this.x - 2, this.y - 4).split(",")
						let rightpos = getTileP(this.x + 2, this.y - 4).split(",")
						if (solids.includes(left) || solids.includes(right)) {
							this.y = Math.round(this.y / 8) * 8 + 4
							this.dy = (this.jetpack ? 3 : 0)
							if (left == 231 && this.keys.length > 0) keyUnlock(leftpos[0], leftpos[1], prefix)
							if (right == 231 && this.keys.length > 0) keyUnlock(rightpos[0], rightpos[1], prefix)
							if (player.unlocked) {
								sfx.unlock.play()
								player.keys.pop()
								player.unlocked = false
							}
						}
					}
				}
				vcol(false)
				vcol("fg")
				this.x += this.dx / 6
				let hcol = (prefix) => {
					if (this.dx + this.cx > 0) {
						let top = getTile(this.x + 3, this.y - 3, prefix)
						let bottom = getTile(this.x + 3, this.y + 3, prefix)
						let toppos = getTileP(this.x + 3, this.y - 3).split(",")
						let bottompos = getTileP(this.x + 3, this.y + 3).split(",")
						if (solids.includes(top) || solids.includes(bottom)) {
							this.x = Math.round(this.x / 8) * 8 - 3
							this.dx = 0
							this.cx = 0
							if (top == 231 && this.keys.length > 0) keyUnlock(toppos[0], toppos[1], prefix)
							if (bottom == 231 && this.keys.length > 0) keyUnlock(bottompos[0], bottompos[1], prefix)
							if (player.unlocked) {
								sfx.unlock.play()
								player.keys.pop()
								player.unlocked = false
							}
						}
					}
					if (this.dx + this.cx < 0) {
						let top = getTile(this.x - 3, this.y - 3, prefix)
						let bottom = getTile(this.x - 3, this.y + 3, prefix)
						let toppos = getTileP(this.x - 3, this.y - 3).split(",")
						let bottompos = getTileP(this.x - 3, this.y + 3).split(",")
						if (solids.includes(top) || solids.includes(bottom)) {
							this.x = Math.round(this.x / 8) * 8 + 3
							this.dx = 0
							this.cx = 0
							if (top == 231 && this.keys.length > 0) keyUnlock(toppos[0], toppos[1], prefix)
							if (bottom == 231 && this.keys.length > 0) keyUnlock(bottompos[0], bottompos[1], prefix)
							if (player.unlocked) {
								sfx.unlock.play()
								player.keys.pop()
								player.unlocked = false
							}
						}
					}
				}
				hcol(false)
				hcol("fg")
			}
			let objcol = (ctilep) => {
				if (this.control) return
				let ctile = levels[currentLevelX + "," + currentLevelY][ctilep]
				if ((ctile == 127 || ctile == 159)) {
					delete levels[currentLevelX + "," + currentLevelY][ctilep]
					this.sunglasses = true
					bigtext = "Sunglasses\nGet!"
					bigtexttime = Date.now() + 3000
					sfx.win.play()
					if (currentmusictrack) currentmusictrack.stop()
					currentmusictrack = music.sunglasses
					chanceofmusic = 0
					currentmusictrack.play()
				}
				if ((ctile == 224) && !this.jetpack) {
					this.jetpack = true
					if (this.jump && this.dy > 2) this.dy = 2
					sfx.getjp.play()
				}
				if ((ctile == 225) && this.jetpack) {
					this.jetpack = false
					sfx.losejp.play()
				}
				if ((ctile == 160 || ctile == 161)) {
					delete levels[currentLevelX + "," + currentLevelY][ctilep]
					sfx.coin.play()
				}
				if (ctile == 230) {
					delete levels[currentLevelX + "," + currentLevelY][ctilep]
					sfx.key.play()
					// new key at old keypos
					this.keys.push({
						x: parseInt(ctilep.split(",")[0])*8+4,
						y: parseInt(ctilep.split(",")[1])*8+4,
					})
				}
			}
			objcol(getTileP(this.x, this.y))
			objcol(getTileP(this.x, this.y, "fg"))
			if (this.dx > 0) this.mirror = true
			if (this.dx < 0) this.mirror = false
			/*
			if(this.canFall(true))
				this.dy += this.gravity;
			else
				this.dy = 0;
			*/
			if (this.dx < -this.speedcap)
				this.dx = -this.speedcap
			if (this.dx > this.speedcap)
				this.dx = this.speedcap
			if (this.dy < -this.jumpheight * 2)
				this.dy += this.gravity;
		}
	}

	let signals = []

	const MPSignal = function(pl, sprite) {
		try {
			sfx.signal.play();
		} catch (e) { }
		this.x = pl.x
		this.y = pl.y
		this.fy = this.y - 16
		this.sprite = sprite
		this.opacity = 0
		this.update = () => {
			this.y += (this.fy - this.y) / 10
			if (Math.round(this.y) == Math.round(this.fy)) {
				this.opacity -= 0.05
				if (this.opacity <= 0)
					this.del = true
			} else
				if (this.opacity < 2)
					this.opacity += 0.05
		}
		this.draw = () => {
			ctx.globalAlpha = this.opacity
			if (this.sprite == 9 || this.sprite == 2)
				p.image(mpsignals, this.x - 4.5 + Math.random(), this.y - 4.5 + Math.random(), 8, 8, this.sprite * 8, pl.sunglasses * 8, 8, 8)
			else
				p.image(mpsignals, this.x - 4, this.y - 4, 8, 8, this.sprite * 8, pl.sunglasses * 8, 8, 8)
			ctx.globalAlpha = 1
		}
	}

	let solids = [ // eventually replace hopefully
		0, 1, 2, 3, 4, 5, 6, 7,
		8, 9, 10, 11, 12, 13, 14, 15,
		16, 17, 18, 19,
		24, 25, 26, 27,
		68, 69, 70, 71,
		76, 77, 78, 79,
		84, 85, 86, 87,
		92, 93, 94, 95,
		96, 97, 98, 99,
		104, 105, 106, 107,
		112, 113, 114, 115,
		120, 121, 122, 123,
		162, 163, 164, 165,
		168, 169, 170, 171, 172, 173, 174, 175,
		176, 180, 181, 182, 183,
		188, 189, 190, 191,
		208, 209, 210, 211,
		216, 217, 218, 219,
		226, 227, 231
	];
	let yvbounce = {
		226: -10
	}

	let icy = [162, 163, 164, 165];
	let conv = {
		208: 1.5,
		209: 1.5,
		210: 1.5,
		211: 1.5,
		216: -1.5,
		217: -1.5,
		218: -1.5,
		219: -1.5,
	}

	let semisolid = [48, 144, 167, 201];
	let currentLevelX = 0;
	let currentLevelY = 0;

	function getTile(x, y, prefix) {
		if (!levels[currentLevelX + "," + (currentLevelY + 1)])
			if (y >= 240)
				return 1;
		if (!levels[currentLevelX + "," + (currentLevelY - 1)])
			if (y < 0)
				y = 0;
		if (!levels[(currentLevelX + 1) + "," + currentLevelY])
			if (x >= 240)
				return 1;
		if (!levels[(currentLevelX - 1) + "," + currentLevelY])
			if (x < 0)
				return 1;
		let tile = levels[currentLevelX + "," + currentLevelY][
			(prefix ? prefix + "_" : "") +
			Math.floor(x / 8) + "," + Math.floor(y / 8)
		]
		if (typeof tile == "undefined")
			return -1
		else
			return tile
	}

	function getTileP(x, y, prefix = false) {
		return (typeof prefix == "string" ? prefix + "_" : "") + Math.floor(x / 8) + "," + Math.floor(y / 8)
	}

	function makeTestLevel() {
		let out = {};
		for (let x = 0; x < 30; x++) {
			out[`${5},${x}`] = 1;
		}
		for (let x = 0; x < 30; x++) {
			out[`${x},${15}`] = 48;
		}
		for (let x = 0; x < 30; x++) {
			out[`${x},${19}`] = x;
		}
		for (let x = 0; x < 30; x++) {
			out[`${x},${20}`] = x + 30;
		}
		for (let x = 0; x < 4; x++) {
			out[`${x},${21}`] = x + 60;
		}
		return out;
	}

	let player;
	let currentLevel = 0;
	let windDirection = 0;
	let windSpeed = 0.55;
	const SCALE = 2; // everything multiplied by this
	//chromebook is tiny
	let spriteDeFuqer;
	//let fuqer;
	let ctx;
	p.preload = function() {
	}

	let START_TILE = {
		x: 1.5,
		y: 25
	}

	let sky_y;
	let pausemenu;
	let optionsmenu;
	let clientSettingsMenu;
	let levelsmenu;
	let loadingmenu;

	let movepacketinterval;

	function loadLevels(lvls) {
		levels = JSON.parse(lvls[0])
		START_TILE = {
			x: parseInt(lvls[1]) + 0.5,
			y: parseInt(lvls[2]) + 0.5
		}
		currentLevelX = 0
		currentLevelY = 0
		sky_y = -720;
		player = new Player(START_TILE.x * 8, START_TILE.y * 8);
		if (currentmusictrack) currentmusictrack.stop()
		chanceofmusic = 0
	}

	let chanceofmusic = 0

	p.setup = function() {
		chanceofmusic = 0
		music.lobby.stop()
		loadLevels(defaultlevels)
		p.frameRate(60);
		p.createCanvas(240 * SCALE, 240 * SCALE);
		ctx = p.drawingContext;
		//fuqer = new LeFuqer(START_TILE.x*8 + 8, START_TILE.y*8 + 8);
		// send 10 packets per second
		movepacketinterval = setInterval(() => {
			send({
				type: "move",
				x: player.x,
				y: player.y,
				dx: player.dx,
				dy: player.dy,
				rx: currentLevelX,
				ry: currentLevelY,
				jump: player.jump,
				down: player.down,
				left: player.left,
				right: player.right,
				sg: player.sunglasses,
				jp: player.jetpack,
			})
		}, 100)
		pausemenu = p.createDiv('<h3>Game Paused</h3>')
		pausemenu.class("flashdiv")
		pausemenu.position(16, 80)
		pausemenu.size(448, 320)

		let htpdiv = p.createDiv(howtoplay)
		pausemenu.child(htpdiv)
		htpdiv.style("padding", "12px")

		pausemenu.child(p.createP(""))

		let resumebtn = p.createButton('Resume Game')
		resumebtn.mouseClicked(() => {
			pausemenu.hide()
			sfx.signal.play()
			paused = false
		})
		resumebtn.mouseOver(() => sfx. select.play())
		pausemenu.child(resumebtn)

		let btnspan = p.createSpan()
		btnspan.style("display", "flex")

		let optionsbtn = p.createButton('Room Settings')
		optionsbtn.mouseClicked(() => {
			pausemenu.hide()
			sfx.signal.play()
			optionsmenu.elt.style.display = "flex"
		})
		optionsbtn.mouseOver(() => sfx.select.play())
		btnspan.child(optionsbtn)
		if (!host) optionsbtn.elt.disabled = true

		optionsmenu = p.createDiv('<h3>Room Settings</h3>')
		optionsmenu.class("flashdiv")
		optionsmenu.position(16, 80)
		optionsmenu.size(448, 320)

		let optionsdiv = p.createDiv()
		optionsmenu.child(optionsdiv)
		optionsdiv.style("padding", "12px")

		loadingmenu = p.createDiv('<h3>Loading</h3>')
		loadingmenu.class("flashdiv")
		loadingmenu.position(16, 80)
		loadingmenu.size(448, 320)
		loadingmenu.hide()

		let loadingdiv = p.createDiv()
		loadingmenu.child(loadingdiv)
		loadingdiv.style("padding", "12px")
		loadingdiv.child(document.createTextNode("Loading..."))

		levelsmenu = p.createDiv('<h3>Level Packs</h3>')
		levelsmenu.class("flashdiv")
		levelsmenu.position(16, 80)
		levelsmenu.size(448, 320)

		let levelsdiv = p.createDiv()
		levelsmenu.child(levelsdiv)
		levelsdiv.style("padding", "12px")

		function getSavedPacks() {
			let span = levelsdiv.elt
			span.style.padding = "10px"
			span.style.display = "flex"
			span.style.flexDirection = "column"
			span.style.justifyContent = "center"
			span.style.height = "100%"
			lvlpacks = JSON.parse(localStorage.lvlpacks)
			// built in packs
			span.innerHTML = "Official Level Packs<span><hr></span>"
			let btnspan = document.createElement("span")
			btnspan.style.flex = "auto 1 0%"
			btnspan.style.overflow = "auto"
			btnspan.style.display = "flex"
			btnspan.style.flexDirection = "column"
			builtins.packs.forEach((e, i) => {
				let btnswrap = document.createElement("span")
				btnswrap.style.display = "flex"
				btnswrap.style.gap = "5px"

				let btn = document.createElement("button")
				btn.onmouseover = () => sfx.select.play()
				btn.className = "flexbtn"
				btn.style.flex = "1"
				let namespan = document.createElement("span")
				namespan.innerText = e.name
				btn.appendChild(namespan)
				btnswrap.appendChild(btn)

				btn.onclick = async () => {
					sfx.signal.play()
					levelsmenu.hide()
					if (!e.cache) {
						loadingmenu.elt.style.display = "flex"
						let c = await (await fetch(e.url)).text()
						e.cache = c
						loadingmenu.hide()
					}
					optionsmenu.elt.style.display = "flex"
					currentLevelPack = e.cache.split("\n")
					broadcast({
						type: "levelpack",
						levelpack: currentLevelPack
					})
				}

				btnspan.appendChild(btnswrap)
			})
			span.appendChild(btnspan)
			// custom packs
			if (lvlpacks.length > 0) {
				{
					let hrspan = document.createElement("span")
					hrspan.append(document.createElement("hr"))
					span.append(hrspan)
				}
				span.append(document.createTextNode("Custom Level Packs"))
				{
					let hrspan = document.createElement("span")
					hrspan.append(document.createElement("hr"))
					span.append(hrspan)
				}
				let btnspan = document.createElement("span")
				btnspan.style.flex = "1"
				btnspan.style.overflow = "auto"
				btnspan.style.display = "flex"
				btnspan.style.flexDirection = "column"
				lvlpacks.forEach((e, i) => {
					let btnswrap = document.createElement("span")
					btnswrap.style.display = "flex"
					btnswrap.style.gap = "5px"

					let btn = document.createElement("button")
					btn.onmouseover = () => sfx.select.play()
					btn.className = "flexbtn"
					btn.style.flex = "1"
					let namespan = document.createElement("span")
					namespan.innerText = `(${i + 1}) ` + e.split(/\r?\n/gm)[3]
					btn.appendChild(namespan)
					btnswrap.appendChild(btn)

					btn.onclick = () => {
						sfx.signal.play()
						levelsmenu.hide()
						optionsmenu.elt.style.display = "flex"
						currentLevelPack = e.split("\n")
						broadcast({
							type: "levelpack",
							levelpack: currentLevelPack
						})
					}

					btnspan.appendChild(btnswrap)
				})
				span.appendChild(btnspan)
			}
		}

		//optionsdiv.child(p.createP("Admin Controls"))

		let tpallherebtn = p.createButton("Teleport All Here")
		optionsdiv.child(tpallherebtn)
		tpallherebtn.mouseClicked(() => {
			sfx.signal.play()
			if (host) broadcast({
				type: "setpos",
				x: player.x,
				y: player.y,
				rx: currentLevelX,
				ry: currentLevelY
			})
		})
		tpallherebtn.mouseOver(() => sfx.select.play())
		tpallherebtn.style("margin-bottom", "10px")

		let announceinp = p.createInput()
		announceinp.elt.placeholder = "Text to announce"
		optionsdiv.child(announceinp)

		let announcebtn = p.createButton("Announce a message")
		optionsdiv.child(announcebtn)
		announcebtn.mouseClicked(() => {
			sfx.signal.play()
			if (host) broadcast({
				type: "bigmsg",
				msg: announceinp.value(),
				time: 3000,
			})
		})
		announcebtn.mouseOver(() => sfx.select.play())
		announcebtn.style("margin-bottom", "10px")

		let jetpackbtn = p.createButton("Toggle jetpack")
		if (ISDEVSERVER && false) optionsdiv.child(jetpackbtn)
		jetpackbtn.mouseClicked(() => {
			sfx.signal.play()
			if (player.jetpack) {
				sfx.losejp.play()
				player.jetpack = false
			} else {
				sfx.getjp.play()
				player.jetpack = true
			}
		})
		jetpackbtn.mouseOver(() => sfx.select.play())
		jetpackbtn.style("margin-bottom", "10px")

		let roomnameinp = p.createInput()
		roomnameinp.elt.placeholder = "Room name"
		roomnameinp.elt.value = host
		optionsdiv.child(roomnameinp)
		roomnameinp.input(() => {
			if (roomnameinp.value().replace(/\s/gm, "").length > 0)
				roomnamebtn.elt.disabled = false
			else
				roomnamebtn.elt.disabled = true

		})

		let roomnamebtn = p.createButton("Change room name")
		optionsdiv.child(roomnamebtn)
		roomnamebtn.mouseClicked(() => {
			sfx.signal.play()
			host = roomnameinp.value()
			heartbeatfunc()
		})
		roomnamebtn.mouseOver(() => sfx.select.play())
		roomnamebtn.style("margin-bottom", "10px")

		let lvlspan = p.createSpan();
		lvlspan.style("display", "flex");
		lvlspan.style("flex-direction", "row");

		let editorbtn = p.createButton("Open Editor")
		lvlspan.child(editorbtn)
		editorbtn.mouseClicked(() => {
			sfx.signal.play()
			window.open("editor/edit.html", "_blank", "popup=true,width=586,height=622").editorData = editorData
		})
		editorbtn.mouseOver(() => sfx.select.play())

		let uploadlvlbtn = p.createButton("Choose level pack")
		lvlspan.child(uploadlvlbtn)
		uploadlvlbtn.mouseClicked(() => {
			sfx.signal.play()
			getSavedPacks()
			levelsmenu.elt.style.display = "flex"
			optionsmenu.hide()
		})
		uploadlvlbtn.mouseOver(() => sfx.select.play())

		lvlspan.style("margin-bottom", "10px")
		optionsdiv.child(lvlspan)

		let backbtn = p.createButton("Back")
		optionsmenu.child(backbtn)
		backbtn.position(12, 12)
		backbtn.style("width", "100px")
		backbtn.mouseClicked(() => {
			pausemenu.elt.style.display = "flex"
			sfx.signal.play()
			optionsmenu.hide()
		})
		backbtn.mouseOver(() => sfx.select.play())

		let lvlbackbtn = p.createButton("Back")
		levelsmenu.child(lvlbackbtn)
		lvlbackbtn.position(12, 12)
		lvlbackbtn.style("width", "100px")
		lvlbackbtn.mouseClicked(() => {
			sfx.signal.play()
			levelsmenu.hide()
			pausemenu.elt.style.display = "flex"
		})
		lvlbackbtn.mouseOver(() => sfx.select.play())

		let clientSettingsBtn = p.createButton("Client Settings")
		btnspan.child(clientSettingsBtn)
		clientSettingsBtn.mouseOver(() => sfx.select.play())
		clientSettingsBtn.mouseClicked(() => {
			sfx.signal.play()
			pausemenu.hide()
			clientSettingsMenu.elt.style.display = "flex"
		})

		clientSettingsMenu = p.createDiv('<h3>Client Settings</h3>')
		clientSettingsMenu.class("flashdiv")
		clientSettingsMenu.position(16, 80)
		clientSettingsMenu.size(448, 320)

		let clientSettingsBackBtn = p.createButton("Back")
		clientSettingsMenu.child(clientSettingsBackBtn)
		clientSettingsBackBtn.position(12, 12)
		clientSettingsBackBtn.style("width", "100px")
		clientSettingsBackBtn.mouseClicked(() => {
			sfx.signal.play()
			clientSettingsMenu.hide()
			pausemenu.elt.style.display = "flex"
		})
		lvlbackbtn.mouseOver(() => sfx.select.play())

		let sliderWrappers = p.createDiv()
		sliderWrappers.style("position", "absolute")
		sliderWrappers.style("top", "60px")
		sliderWrappers.style("width", "420px")
		sliderWrappers.style("overflow", "hidden")
		sliderWrappers.elt.style.display = "flex"
		clientSettingsMenu.child(sliderWrappers)

		let musicSliderDesc = p.createSpan('Music')
		musicSliderDesc.style("margin", "15px")
		musicSliderDesc.elt.style.display = "flex"
		sliderWrappers.child(musicSliderDesc)
		let musicSlider = p.createInput(currentMusicLevel + '', 'range')
		musicSlider.style("width", "95%")
		musicSlider.elt.style.display = "flex"
		sliderWrappers.child(musicSlider)

		let disconnectbtn = p.createButton('Disconnect')
		disconnectbtn.mouseClicked(() => {
			sfx.signal.play()
			if (conn) {
				showerr = false
				conn.close()
				conn = false
			} else p.quit()
		})
		btnspan.child(disconnectbtn)
		disconnectbtn.mouseOver(() => sfx.select.play())

		pausemenu.child(btnspan)

		pausemenu.hide();
		optionsmenu.hide();
		levelsmenu.hide();
		clientSettingsMenu.hide();
	}

	let ingametimer = 0

	p.draw = function() {
		// handle music playing
		let preferredmusic
		if (currentLevelY > -7) {
			preferredmusic = music.grass
		} else if (currentLevelY > -9) {
			preferredmusic = music.cave
		} else if (currentLevelY > -13) {
			preferredmusic = music.night
		} else if (currentLevelY > -16) {
			preferredmusic = music.space
		} else {
			preferredmusic = null
		}
		if ((!currentmusictrack || !currentmusictrack.currentplaying) && preferredmusic) {
			chanceofmusic = chanceofmusic + 0.00001
		} else if (currentmusictrack && currentmusictrack.currentplaying) {
			if (currentmusictrack != preferredmusic && currentmusictrack != music.sunglasses) {
				let newvol = currentmusictrack.currentplaying.volume
				newvol -= 0.001
				if (newvol <= 0) {
					currentmusictrack = null
				} else {
					currentmusictrack.currentplaying.volume = newvol
				}
			} else {
				let newvol = currentmusictrack.currentplaying.volume
				newvol += 0.001
				if (newvol < 1) {
					currentmusictrack.currentplaying.volume = newvol
				} else {
					currentmusictrack.currentplaying.volume = 1
				}
			}
		}
		if (Math.random() < chanceofmusic && preferredmusic) {
			currentmusictrack = preferredmusic
			currentmusictrack.play()
			chanceofmusic = 0
		}
		//update
		player.update();
		//fuqer.update();	
		sky_y = currentLevelY * -36 - 720;
		animtimer += 1;
		panimtimer += 1;
		if (animtimer >= 5) {
			animtimer = 0
			player.walkframe += 1
			blinkon = (blinkon + 1) % 4
		}
		// draw
		ctx.globalAlpha = 1
		p.noSmooth();
		p.scale(SCALE);
		p.background(sky_y >= 0 ? "#111D35" : "#29ADFF");
		p.image(sky, 0, sky_y);
		drawLevelbg();
		ctx.globalAlpha = 0.65
		for (const [id, z] of Object.entries(mpClients)) {
			z.update();
			z.draw();
		}
		ctx.globalAlpha = 1
		player.draw();
		drawNPCShizz();
		drawLevelfg();
		ctx.globalAlpha = 1
		for (let i = 0; i < signals.length; i++) {
			let s = signals[i]
			s.update()
			if (s.del) {
				signals.splice(i, 1)
				i--
			} else s.draw()
		}

		ctx.shadowColor = 'black';
		ctx.shadowBlur = 3;
		p.fill("#fff");
		p.stroke("#000");
		p.strokeWeight(0.5);

		if (moved) ingametimer += p.deltaTime
		p.textSize(9);
		p.textAlign(p.CENTER, p.TOP);
		p.text(getTimer(ingametimer), 120, 8);

		drawNPCText();

		if ((bottomtexttime - Date.now()) > 0 || bottomtexttime == 0) {
			p.textAlign(p.LEFT, p.BOTTOM);
			ctx.globalAlpha = (bottomtexttime - Date.now()) / 2000;
			p.text(bottomtext, 4, 236);
			ctx.globalAlpha = 1;
		}

		p.textSize(15);
		if ((bigtexttime - Date.now()) > 0 || bigtexttime == 0) {
			p.textAlign(p.CENTER, p.CENTER);
			ctx.globalAlpha = (bigtexttime - Date.now()) / 2000;
			p.text(bigtext, 120, 120);
			ctx.globalAlpha = 1;
		}

		p.textSize(9);
		if (!moved) {
			p.fill("#0007");
			p.stroke("#0000");
			p.rect(0, 0, 240, 240);
			p.fill("#fff");
			p.stroke("#000");
			p.textAlign(p.CENTER, p.CENTER);
			p.text("Not Alone", 120, 30);
			p.text("WASD/Arrow keys to move\nSPACE to jump\nESC to pause\n\nTry to make it to the top", 120, 120);
			p.text("Press any key to start", 120, 210);
		}
		if (paused) {
			p.fill("#0003");
			p.stroke("#0000");
			p.rect(0, 0, 240, 240);
			p.fill("#fff");
			p.stroke("#000");
			p.textAlign(p.CENTER, p.CENTER);
		}

		if (p.keyIsDown(p.SHIFT) || p.keyIsDown(69))
			p.image(mptooltip, 79, 120);

		if (dev) {
			p.textAlign(p.LEFT, p.TOP);
			p.scale(1 / SCALE);
			p.text(`X: ${Math.round(player.x)}
Y: ${Math.round(player.y)}
DX: ${(player.dx)}
DY: ${(player.dy)}
Room: ${currentLevelX},${currentLevelY}
MPClients: ${Object.keys(mpClients).length}
Signals: ${signals.length}`, 0, 0)
		}
		ctx.shadowBlur = 0;
	}

	function getTimer(millis) {
		var hours = Math.floor(millis / 3600000);
		var minutes = Math.floor(millis / 60000) % 60;
		var seconds = Math.floor(millis / 1000) % 60;
		return (hours ? hours + ":" + minutes.toString().padStart(2, "0") : minutes) + ":" + seconds.toString().padStart(2, "0") + "." + Math.floor(millis % 1000).toString().padStart(3, "0");
	}

	let activeNPCS = []

	function drawNPCShizz() {
		npcText = []
		let level = levels[currentLevelX + "," + currentLevelY];
		activeNPCS = []
		for (let y = 0; y < 30; y++) {
			for (let x = 0; x < 30; x++) {
				if (level["npc_" + x + ',' + y]) {
					let npc = level["npc_" + x + ',' + y]
					if (Math.abs(player.x - (x * 8 + 4)) <= 40 &&
						Math.abs(player.y - (y * 8 + 4)) <= 10) {
						activeNPCS.push(npc)
						npcText.push([x < 10 ? p.LEFT : x < 20 ? p.CENTER : p.RIGHT, [(npc.text.length > 1 && blinkon > 1 ? (npc.index < npc.text.length - 1 ? "▲" : " ● ") + "\n" : "") + npc.text[npc.index], x * 8 + 4, y * 8 - 4]]);
					}
					let tile = npc.sprite;
					let tilex = (tile % 8) * 8;
					let tiley = tile - tile % 8;
					// actual tile
					p.image(npcs, x * 8, y * 8, 8, 8, tilex, tiley + (player.x > x * 8 + 4 ? 64 : 0), 8, 8);
				}
			}
		}
	}

	let npcText = []

	function drawNPCText() {
		for (let i = 0; i < npcText.length; i++) {
			p.textSize(8);
			p.textAlign(npcText[i][0], p.BOTTOM);
			p.text(...npcText[i][1])
		}
	}

	let frames = {
		20: 21,
		21: 64,
		64: 65,
		65: 20,
		28: 29,
		29: 30,
		30: 31,
		31: 28,
		88: 89,
		89: 90,
		90: 91,
		91: 88,
		127: 159,
		159: 127,
		160: 161,
		161: 160,
		208: 209,
		209: 210,
		210: 211,
		211: 208,
		216: 217,
		217: 218,
		218: 219,
		219: 216,
	}

	function drawLevelbg() {
		p.noStroke();
		p.fill(0);
		let level = levels[currentLevelX + "," + currentLevelY];
		for (let y = 0; y < 30; y++) {
			for (let x = 0; x < 30; x++) {
				// bg tile
				// p.image(tilesets[level.tileset||"grassy"], x*8, y*8, 8, 8, 56, 120, 8, 8);
				if (typeof level[x + ',' + y] == "number") {
					if (animtimer == 0) {
						if (frames[level[x + ',' + y]]) level[x + ',' + y] = frames[level[x + ',' + y]]
					}
					let tile = level[x + ',' + y];
					let tilex = (tile % 8) * 8;
					let tiley = tile - tile % 8;
					// actual tile
					if (player.jetpack && tile == 224 || !player.jetpack && tile == 225)
						ctx.globalAlpha = 0.25
					else
						ctx.globalAlpha = 1
					p.image(tilesets[level.tileset || "grassy"], x * 8, y * 8, 8, 8, tilex, tiley, 8, 8);
				}
			}
		}
	}

	function drawLevelfg() {
		p.noStroke();
		p.fill(0);
		let level = levels[currentLevelX + "," + currentLevelY];
		for (let y = 0; y < 30; y++) {
			for (let x = 0; x < 30; x++) {
				if (typeof level["fg_" + x + ',' + y] == "number") {
					if (animtimer == 0) {
						if (frames[level["fg_" + x + ',' + y]]) level["fg_" + x + ',' + y] = frames[level["fg_" + x + ',' + y]]
					}
					let tile = level["fg_" + x + ',' + y];
					let tilex = (tile % 8) * 8;
					let tiley = tile - tile % 8;
					// actual tile
					if (player.jetpack && tile == 224 || !player.jetpack && tile == 225)
						ctx.globalAlpha = 0.25
					else
						ctx.globalAlpha = 1
					p.image(tilesets[level.tileset || "grassy"], x * 8, y * 8, 8, 8, tilex, tiley, 8, 8);
				}
			}
		}
	}

	p.keyPressed = function() {
		moved = true
		if (p.keyCode == p.ESCAPE) {
			if (loadingmenu.elt.style.display != "flex") {
				paused = !paused
				if (paused)
					pausemenu.elt.style.display = "flex"
				else
					pausemenu.hide()
				clientSettingsMenu.hide()
				optionsmenu.hide()
				levelsmenu.hide()
			}
		}
		if (paused) return
		if (!settings.swapJumpAndTalk ? (p.keyCode == (87) || p.keyCode == (button_npcTalk)) : p.keyCode == (button_jump)) {
			send({
				type: "control",
				key: "up",
			})
			for (let i = 0; i < activeNPCS.length; i++) {
				let npc = activeNPCS[i]
				npc.index = (npc.index + 1) % npc.text.length
				send({
					type: "talkto",
					index: npc.index,
					text: npc.text[npc.index],
				})
			}
		}
		if (p.keyCode == 49) {
			signals.push(new MPSignal(player, 0))
			send({
				type: "signal",
				sprite: 0,
			})
		}
		if (p.keyCode == 50) {
			signals.push(new MPSignal(player, 1))
			send({
				type: "signal",
				sprite: 1,
			})
		}
		if (p.keyCode == 51) {
			signals.push(new MPSignal(player, 2))
			send({
				type: "signal",
				sprite: 2,
			})
		}
		if (p.keyCode == 52) {
			signals.push(new MPSignal(player, 3))
			send({
				type: "signal",
				sprite: 3,
			})
		}
		if (p.keyCode == 53) {
			signals.push(new MPSignal(player, 4))
			send({
				type: "signal",
				sprite: 4,
			})
		}
		if (p.keyCode == 54) {
			signals.push(new MPSignal(player, 5))
			send({
				type: "signal",
				sprite: 5,
			})
		}
		if (p.keyCode == 55) {
			signals.push(new MPSignal(player, 6))
			send({
				type: "signal",
				sprite: 6,
			})
		}
		if (p.keyCode == 56) {
			signals.push(new MPSignal(player, 7))
			send({
				type: "signal",
				sprite: 7,
			})
		}
		if (p.keyCode == 57) {
			signals.push(new MPSignal(player, 8))
			send({
				type: "signal",
				sprite: 8,
			})
		}
		if (p.keyCode == 48) {
			signals.push(new MPSignal(player, 9))
			send({
				type: "signal",
				sprite: 9,
			})
		}
		let left = (p.keyIsDown(65) || p.keyIsDown(p.LEFT_ARROW))
		let right = (p.keyIsDown(68) || p.keyIsDown(p.RIGHT_ARROW))
		let down = (p.keyIsDown(83) || p.keyIsDown(p.DOWN_ARROW))
		let jump = settings.swapJumpAndTalk ? (p.keyIsDown(87) || p.keyIsDown(button_npcTalk)) : p.keyIsDown(button_jump)
		if (left)
			send({
				type: "control",
				key: "left",
			})
		if (right)
			send({
				type: "control",
				key: "right",
			})
		if (down)
			send({
				type: "control",
				key: "down",
			})
		if (jump)
			send({
				type: "control",
				key: "jump",
			})
		if (p.keyCode == 192) {
			dev = !dev
		}
	}

	connect();

}

let bg;
let fg;
// menu code
const m = p => {
	if (conn) {
		conn.close()
		conn = false
	}
	let ctx;
	let lobbylist;
	let ctrlbuttons; // >:(
	let hostbtn;
	let singleplayer;
	let roomsdiv;
	let refreshbtn;
	let editorbtn;
	let helpbtn;
	let roomname;
	let msgbox;
	let query = "";
	function getRooms() {
		roomsdiv.html("Loading")
		fetch("https://ns.jrtech.me/list/" + query)
			.then(res => res.text())
			.then(data => {
				// <button>Play Classic</button><hr>
				roomsdiv.html('<input type="text" placeholder="Room name or ID"><hr>')
				let rooms = JSON.parse(data)
				if (rooms.lobbies.length) for (let i = 0; i < rooms.lobbies.length; i++) {
					let room = rooms.lobbies[i]
					const connID = room.connID
					let btn = p.createButton("")
					btn.mouseOver(() => sfx.select.play())
					btn.class("flexbtn")
					btn.mouseClicked(() => {
						sfx.signal.play()
						if (room.version > VERSION)
							return showMsgBox("Outdated!", "Your version of the game is out of date, and cannot connect to rooms on version " + VERSION.toFixed(1) + ".0 or above. Consider updating!")
						showMsgBox("Connecting", "Locating room...", false)
						fetch("https://ns.jrtech.me/get/" + connID)
							.then(res => res.text())
							.then(data => {
								if (data == "oops")
									showMsgBox("Uh oh!", "Something went wrong behind the scenes. Please let us know the room you were trying to connect to.")
								else if (data == "nonexistant")
									showMsgBox("Uh oh!", "That room no longer exists! Either the host left, or the room closed before you could join.")
								else {
									console.log("joining" + (connectid = data))
									host = false
									game = new p5(g, gamewin)
									p.remove()
								}
							})
					})
					let namespan = p.createSpan()
					namespan.elt.innerText = room.name
					let idspan = p.createSpan()
					idspan.elt.innerText = "#" + room.connID
					idspan.style("color", "#fff3")
					namespan.child(idspan)
					btn.child(namespan)
					let verspan = p.createSpan()
					verspan.elt.innerText = parseFloat(room.version).toFixed(1) + "." + room.patch
					if (room.version > VERSION)
						verspan.style("color", "#f00")
					btn.child(verspan)
					roomsdiv.child(btn)
				}
				else
					roomsdiv.html('<input type="text" placeholder="Room name or ID"><hr>No rooms available')
				roomsdiv.elt.firstChild.value = query
				roomsdiv.elt.firstChild.onchange = () => {
					query = roomsdiv.elt.firstChild.value
					getRooms()
				}
			})
			.catch(e => {
				roomsdiv.html("Unable to connect")
				console.error(e)
			})
	}
	let showMsgBox
	p.preload = function() {
		if (!bg) bg = p.loadImage("menubg.png")
		if (!fg) fg = p.loadImage("menufg.png")
		if (!jetpack) jetpack = p.loadImage("jetpack.png")
		if (!mptooltip) mptooltip = p.loadImage("mptooltip.png");
		if (!mpsignals) mpsignals = p.loadImage("mp signals.png");
		if (!sky) sky = p.loadImage("sky.png");
		if (!npcs) npcs = p.loadImage("npcs.png");
		if (!tilesets.grassy) tilesets.grassy = p.loadImage("tiles/grassy.png");
		if (!player_img) player_img = p.loadImage("character.png");
		if (!defaultlevels) defaultlevels = p.loadStrings("levelpacks/classic.lvls")
		if (!builtins) builtins = p.loadJSON("levelpacks/builtins.json")
	}
	p.setup = function() {
		builtins.packs[0].cache = defaultlevels.join("\n")
		p.createCanvas(480, 480)
		ctx = p.drawingContext

		lobbylist = p.createDiv('<h2>Rooms</h2>')
		lobbylist.class("flashdiv")
		lobbylist.position(16, 48)
		lobbylist.size(448, 352)

		msgbox = p.createDiv('')
		msgbox.class("flashdiv")
		msgbox.position(16, 70)
		msgbox.size(448, 340)

		let msgboxtitle = document.createElement("h2")
		msgbox.child(msgboxtitle)

		let msgboxdiv = document.createElement("div")
		msgbox.child(msgboxdiv)

		let msgboxclose = p.createButton("Close")
		msgbox.child(msgboxclose)
		function closemsgbox() {
			if (msgbox.elt.style.display != "flex") return
			getRooms()
			sfx.signal.play()
			msgbox.hide()
			lobbylist.elt.style.display = "flex"
			ctrlbuttons.elt.style.display = "flex"
		}
		msgboxclose.mouseClicked(closemsgbox)
		msgboxclose.mouseOver(() => sfx.select.play())

		showMsgBox = function(title, message, closebtn = true) {
			msgboxtitle.innerText = title
			msgboxdiv.innerText = message
			lobbylist.hide()
			ctrlbuttons.hide()
			if (closebtn)
				msgboxclose.show()
			else
				msgboxclose.hide()
			msgbox.elt.style.display = "flex"
		}

		roomsdiv = p.createDiv()
		lobbylist.child(roomsdiv)

		editorbtn = p.createButton("Open Editor")
		lobbylist.child(editorbtn)
		editorbtn.position(48, 12)
		editorbtn.style("width", "100px")
		editorbtn.mouseClicked(() => {
			sfx.signal.play()
			window.open("editor/edit.html", "_blank", "popup=true,width=586,height=622").editorData = editorData
		})
		editorbtn.mouseOver(() => sfx.select.play())

		helpbtn = p.createButton("?")
		lobbylist.child(helpbtn)
		helpbtn.position(12, 12)
		helpbtn.style("width", "24px")
		helpbtn.mouseOver(() => sfx.select.play())
		helpbtn.mouseClicked(() => {
			sfx.signal.play()
			showMsgBox("Help", `Playing Online

You can play online with other people by selecting a room from the list. You can also host your own room, by typing in a room name and pressing "Host" down at the bottom.

If you have a bad connection, or just don't want to deal with other people, you can click "Singleplayer" to play singleplayer.

If no rooms are showing up for you, try pressing "Refresh" to reload the list.



In-game Controls:

${htpDefault}

Credits:

Made with PeerJS and P5

Created by PixlPerfect01 and DTmakesgames`)
		})

		refreshbtn = p.createButton("Refresh")
		refreshbtn.mouseOver(() => sfx.select.play())
		lobbylist.child(refreshbtn)
		refreshbtn.style("position", "absolute")
		refreshbtn.style("right", "12px")
		refreshbtn.style("top", "12px")
		refreshbtn.style("width", "137px")
		refreshbtn.mouseClicked(() => {
			sfx.signal.play()
			getRooms()
		})
		getRooms()

		ctrlbuttons = p.createDiv('')
		ctrlbuttons.class("flashdiv")
		ctrlbuttons.position(16, 408)
		ctrlbuttons.size(448, 48)

		roomname = p.createInput("")
		ctrlbuttons.child(roomname)
		roomname.position(120, 12)
		roomname.style("width", "256px")
		roomname.elt.placeholder = "Room name"
		roomname.input(() => {
			if (roomname.value().replace(/\s/gm, "").length > 0)
				hostbtn.elt.disabled = false
			else
				hostbtn.elt.disabled = true
		})

		hostbtn = p.createButton("Host")
		hostbtn.mouseOver(() => sfx.select.play())
		hostbtn.elt.disabled = true
		ctrlbuttons.child(hostbtn)
		hostbtn.style("position", "absolute")
		hostbtn.style("right", "12px")
		hostbtn.style("top", "12px")
		hostbtn.style("width", "50px")
		hostbtn.mouseClicked(() => {
			sfx.signal.play()
			host = roomname.value()
			connectid = false
			game = new p5(g, gamewin)
			p.remove()
		})

		singleplayer = p.createButton("Singleplayer")
		singleplayer.mouseOver(() => sfx.select.play())
		ctrlbuttons.child(singleplayer)
		singleplayer.position(12, 12)
		singleplayer.style("width", "100px")
		singleplayer.mouseClicked(() => {
			sfx.signal.play()
			host = false
			connectid = false
			game = new p5(g, gamewin)
			p.remove()
		})

		if (errmsg && showerr) {
			showMsgBox(errtitle || "Uh oh!", errmsg)
			errtitle = false;
			errmsg = false
		} else {
			msgbox.hide()
			lobbylist.elt.style.display = "flex"
			ctrlbuttons.elt.style.display = "flex"
		}
		showerr = true
		p.keyPressed = ()=>{
			if (p.keyCode == p.ESCAPE) closemsgbox()
		}
	}
	let bgpos = 0;
	let bgx = Math.floor(Math.random()*2)*240
	let bgy = Math.floor(Math.random()*2)*120
	p.draw = function() {
		if (!music.lobby.currentplaying) {
			music.lobby.loop()
		}
		bgpos = (bgpos + 0.125) % 240
		p.scale(2)
		p.noSmooth()
		p.scale(2)
		p.image(bg, -bgpos, 0, 240, 120, bgx, bgy, 240, 120)
		p.image(bg, -bgpos+240, 0, 240, 120, bgx, bgy, 240, 120)
		ctx.filter = "blur(3px)"
		p.image(bg, -bgpos, 0, 240, 120, bgx, bgy, 240, 120)
		p.image(bg, -bgpos+240, 0, 240, 120, bgx, bgy, 240, 120)
		p.image(fg, -bgpos, 0)
		p.image(fg, -bgpos+240)
		ctx.filter = "none"
		p.scale(1 / 2)
		p.fill("#0007")
		p.noStroke()
		p.rect(0, 0, 240, 240)

		ctx.shadowColor = 'black';
		ctx.shadowBlur = 3;
		p.fill("#fff");
		p.stroke("#000");
		p.strokeWeight(0.5);

		p.textSize(12)
		p.textAlign(p.CENTER, p.TOP)
		p.text("Not Alone", 120, 8)

		p.textSize(6)
		p.textAlign(p.LEFT, p.BASELINE)
		p.text(VERSION_str, 0, 240)

		ctx.shadowBlur = 0;
	}
}
game = new p5(m, gamewin)

const http = require('http')

let lobbycount = 0
let lobbies = {}
let connectionIDS = {}

const requestListener = function (req, res) {
	res.setHeader('Content-Type', 'text/plain')
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', 'content-type');
	res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
	res.writeHead(200)
	// being lazy as fuck
	let params = req.url.split("/")
	params.shift() // remove first empty item
	let cmd = params.shift() // get first subdir 
	try {
		if (cmd == "heartbeat") {
			let id = params.shift()
			let name = params.shift()
			let version = params.shift() || 0
			let patch = params.shift() || 0
			if (!id || !name) throw "oops"
			id = decodeURI(id)
			name = decodeURI(name)
			let lobby
			if (lobbies[id]) {
				lobby = lobbies[id]
				clearTimeout(lobby.timeout)
				lobby.timeout = setTimeout(()=>{
					delete lobbies[id]
					delete connectionIDS[lobby.connID]
				},30000)
			} else {
				let connID = ++lobbycount
				lobby = lobbies[id] = connectionIDS[connID] = {
					id: id,
					connID: connID,
					timeout: setTimeout(()=>{
						delete lobbies[id]
						delete connectionIDS[connID]
					},30000),
				}
			}
			lobby.name = name
			lobby.version = version
			lobby.patch = patch
			res.end(JSON.stringify({
				success: true,
				name: name,
				id: id,
				connID: lobby.connID
			}))
		} else if (cmd == "flatline") {
			let id = params.shift()
			if (!id) throw "oops"
			id = decodeURI(id)
			if (lobbies[id]) {
				clearTimeout(lobbies[id].timeout)
				delete connectionIDS[lobbies[id].connID]
				delete lobbies[id]
			} else
				throw "oops"
			res.end(JSON.stringify({
				success: true,
				id: id,
			}))
		} else if (cmd == "list") {
			let query = params.shift() || ""
			let lobbyIDs = Object.keys(lobbies)
			let toSend = []
			let index = 0;
			if (connectionIDS[query]) toSend.push({
				name: connectionIDS[query].name,
				connID: connectionIDS[query].connID,
				version: connectionIDS[query].version,
				patch: connectionIDS[query].patch
			})
			else for (let i = 0; i < lobbyIDs.length && index < 50; i++) {
				let lobby = lobbies[lobbyIDs[i]]
				if (lobby.name.includes(query)) {
					toSend.push({
						name: lobby.name,
						connID: lobby.connID,
						version: lobby.version,
						patch: lobby.patch
					})
					index++
				}
			}
			res.end(JSON.stringify({
			    query: query,
				lobbies: toSend,
			}))
		} else if (cmd == "get") {
			let connID = params.shift()
			if (connID == undefined || !connectionIDS[connID])
				res.end("nonexistant")
			else
				res.end(connectionIDS[connID].id)
		} else
			throw "oops"
	} catch (e) {
		res.end("oops")
		console.log(e)
	}
}

const server = http.createServer(requestListener)
server.listen(8080)


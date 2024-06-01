# Packet Docs

## Used Packets

Packets actively sent and interpreted in the vanilla game.

### `move`

sent whenever the player moves

when received, updates the player hologram it corresponds with (or creates it if it does not exist)

- `id` - client id
- `x` - player x
- `y` - player y
- `dx` - player horizontal velocity
- `dy` - player vertical velocity
- `rx` - player screen x
- `ry` - player screen y
- `jump` - whether the player is pressing jump
- `down` - whether the player is pressing down
- `left` - whether the player is pressing left
- `right` - whether the player is pressing right
- `sg` - whether the player has sunglasses on
- `jp` - whether the player has a jetpack

### `signal`

sent when a player sends a multiplayer signal

when received, shows a signal above the corresponding player's head

- `id` - client id
- `sprite` (0-9) - the signal sprite to use

### `msg`

sent when a player connects or disconnects

when received, sets the message in the lower left corner

- `id` - unused (always 0)
- `msg` - the text to show
- `time` - the time in milliseconds to show the message

### `remove`

sent when a player disconnects

when received, removes the player hologram the id corresponds with

- `id` - player id to remove

### `levelpack`

sent when the levelpack is updated, or when a new player joins a room

when received, updates the levelpack to the received value and resets the levels. if the client is still on the connecting screen, this packet also removes that screen. the client wont show the game window until at least one levelpack has been receied

- `levelpack` - the levelpack

### `setpos`

sent when the host clicks "Teleport All Here"

when received, sets own player position to received values

- `x` - player x
- `y` - player y
- `rx` - player screen x
- `ry` - player screen y

### `bigmsg`

sent when the host clicks "Announce a message"

when received, sets the big text in the center of the screen

- `msg` - the text to show
- `time` - the time in milliseconds to show the message

### `control`

sent when one of the control keys are pressed

when received, if key is reset, the host will re-send the current level pack to the client

- `key` (up/down/left/right/jump/reset) - the control key that was pressed

### `timer`

sent when the host receives a reset request from a client

when received, modifies the timer that appears at the top of the screen

- `time` - the time in seconds to set the timer to
- `countdown` - whether or not the timer should be counting down
- `hidden` - whether or not the timer is hidden
- `paused` - whether or not the timer is paused

### `setting`

sent when the host changes one of the host settings

when received, modifies the local copy of the host settings

- `communication` - whether or not players are allowed to send signals

## Ignored packets

Packets that are sent, but normally are ignored when received and not interpreted.

### `talkto`

sent when a player talks to an npc

ignored when received

- `id` - player id
- `index` - the npc index that was talked to
- `text` - the text that the npc says next

## Unused packets

Packets that are never sent in the vanilla game, but will be interpreted when received

### `setvel`

never sent in vanilla

when received, sets own player velocity to received values

- `dx` - player horizontal velocity
- `dy` - player vertical velocity

### `motd`

never sent in vanilla

when received, sets the text on the pause menu (defaults to the how to play screen)

- `msg` - text to set it to

### `texture`

never sent in vanilla

when received, replaces the tileset texture that shares the id specified. 

- `id` - the id to use. defaults to "default", which is the default texture used in levels
- `url` - the url or uri the image is located at
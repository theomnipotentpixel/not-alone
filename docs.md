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

sent when the levelpack is updated, or when a new player joins a room with a custom levelpack

when received, updates the levelpack to the received value and resets the levels

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

## Ignored packets

Packets that are sent, but normally are ignored when received and not interpreted.

### `control`

sent when one of the control keys are pressed

ignored when received

- `key` (up/down/left/right/jump) - the control key that was pressed

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
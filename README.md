# Mineflayer-Spectator

Spectate your [Mineflayer](https://github.com/prismarinejs/mineflayer) bot in-game.  
**Please note:** This project only aims to support the latest version of Minecraft (at time of writing this is 1.20.1)

# Example usage

```js
const { createBot } = require('mineflayer')
const { startSpectatorServer } = require('mineflayer-spectator')

const bot = mineflayer.createBot({
    host: 'example.com',
    port: 25565,
    username: 'MyBot',
    version: '1.20.1'
})
startSpectatorServer(bot, { port: 25565 })
```
You will then see a message in console saying you can join the spectator server:
```
Mineflayer-Spectator server now available to join at localhost:25565
```

# Server Commands
In the server you can access some commands as a spectator.
- `/spectatortp [<player>]` - Teleport to the bot or a player, if no arguments are passed you will be teleported to the bot.  

If you run a command that is not registered as a spectator command, it will be run as the bot if `spectatorsCanChat` is true.   
You can also register your own commands!

# API
### .startSpectatorServer(bot: mineflayer.Bot, options?: [StartSpectatorServerOptions](#startspectatorserverbot-mineflayerbot-options-startspectatorserveroptions)): [SpectatorServer](#spectatorserver)

Starts the spectator server with the given options. The spectator server must be started before the bots login has completed, as some data in the bot's registry needs to be populated.

## Types

### StartSpectatorServerOptions
None of the options are required.
- port?: number - The port for the server to listen on, if no port is provided, port 25565 will be used.
- logging?: boolean - Whether or not to log messages to console, for example when the server is available to join, defaults to true
- spectatorsCanChat?: boolean - Whether or not spectators on the server's messages in chat will be sent by the bot, defaults to true
- hideErrors?: boolean - The hideErrors value to pass to node-minecraft-protocol when creating the server
- password?: string - If set, players joining the spectator server will be required to enter the password before being able to view the bot and perform actions
- onlineMode?: boolean - Whether or not the server should run in online mode, defaults to false
- whitelist?: string[] - An array of usernames or uuids of players who should be allowed to join the spectator server. **Please note:** The server is by default in offline mode, which makes even a whitelist insecure. Change the server to online mode or use the `password` option if the server is going to be hosted on a publicly accessible IP and is in offline mode.

### SpectatorServer
- port: number - The port the server is listening on
- close() - A method to close the server. **Note:** this will not clean up listeners registered on the bot by mineflayer-spectator, so this is technically a memory leak. Mineflayer-spectator is designed to be always used while the bot is running.
- connectedSpectators: string[] - An array of usernames of the spectators currently connected to the spectator server
- _server: [mc.Server](https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/docs/API.md#mcserverversioncustompackets) - The Server instance from node-minecraft-protocol, in most cases you will not need to interact with this.
- declareCommands(commands: [Command](#command)[]) - declareCommands allows you to register commands on the server, it accepts an array of the [Command](#command) type. **Please note:** No validation is carried out on the command, it is up to you to validate all inputs in your handler.

### Command
- name: string - The name of the command
- handler(cmd: string, client: [mc.Client](https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/docs/API.md#mcclientisserverversioncustompackets)) - The handler to be called when the command is executed
- arguments?: [CommandArgument](#commandargument)[] - An array of command arguments

### CommandArgument
- name: string - The name of the argument
- required?: boolean - Whether or not the argument is required
- tabCompleteHandler?: (cmd: string) => string[] - Called whenever a spectator tab completes the argument, returns an array of available options

# Screenshots

![image](https://i.imgur.com/NYKIJq0.png)
![image](https://i.imgur.com/1VbxUMh.png)

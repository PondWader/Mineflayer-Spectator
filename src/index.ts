import mineflayer from "mineflayer"
import { Server, createServer, states } from "minecraft-protocol"
import { handleClient } from "./client"
import { registerChunkListeners } from "./handlers/chunks"
import { registerEntityListeners } from "./handlers/entities"
import { loadServerboundInterceptor } from "./handlers/serverbound"
import { registerGeneralListeners } from "./handlers/general"
import { Command, addCommandsToData } from "./commands"
import { createSpectatorTpCommand } from "./commands/spectatortp"
import { _Server } from "./types"
import { registerRespawnListener } from "./handlers/respawn"

const SUPPORTED_VERSION = '1.20.1'

export type MineflayerSpectatorServer = {         
    port: number,
    close: () => void,
    connectedSpectators: string[],
    _server: Server,
    declareCommands: (commands: Command[]) => void
}

export function startSpectatorServer(bot: mineflayer.Bot, options?: { 
    port?: number, 
    logging?: boolean,  
    spectatorsCanChat?: boolean,
    hideErrors?: boolean,
    password?: string,
    onlineMode?: boolean,
    whitelist?: string[]
}): MineflayerSpectatorServer {
    const port = options?.port ?? 25565
    const logging = options?.logging ?? true

    if (bot._client.state === states.PLAY) throw new Error('You cannot start Mineflayer-Spectator after the bot has logged in')
    if (logging && bot.registry.version['<'](SUPPORTED_VERSION)) console.log('WARNING: You are using Mineflayer-Spectator on an older version of Minecraft, it is not guaranteed to work as expected.')

    const srv = createServer({
        port,
        'online-mode': options?.onlineMode ?? false,
        version: bot.version,
        hideErrors: options?.hideErrors,
        motdMsg: {
            text: `Mineflayer-Spectator server for ${bot.username}\n`,
            color: 'yellow',
            extra: {
                text: 'https://github.com/PondWader/Mineflayer-Spectator',
                color: 'gray'
            }
        }
    }) as _Server
    if (logging) srv.once('listening', () => console.log(`Mineflayer-Spectator server now available to join at localhost:${port}`))
    if (logging && !options?.onlineMode && options?.whitelist) console.log('WARNING: You have the whitelist enabled for Mineflayer-Spectator but your server is in offline mode. This means anyone can join with any username. You can change this by passing "onlineMode: true" as an option.')

    srv.writeAll = (packetName: string, data: any) => {
        for (const client of Object.values(srv.clients)) {
            if (client.state === states.PLAY) client.write(packetName, data)
        }
    }

    const excludedPackets = new Set<string>()
    excludedPackets.add('bundle_delimiter')
    excludedPackets.add('abilities')
    srv.excludePacketFromProxy = (...packetNames: string[]) => {
        for (const packet of packetNames) excludedPackets.add(packet)
    }

    let loggedIn = false
    bot._client.once('login', (packet) => {
        bot.registry.loginPacket = packet
        loggedIn = true

        bot._client.on('packet', (data, meta) => {
            if (!excludedPackets.has(meta.name)) {
                srv.writeAll(meta.name, data)
            }
        })
    })
    
    const commandList: Command[] = [
        createSpectatorTpCommand(bot)
    ]

    registerChunkListeners(bot, srv)
    registerEntityListeners(bot, srv)
    registerGeneralListeners(bot, srv, commandList)
    registerRespawnListener(bot, srv)
    loadServerboundInterceptor(bot, srv)

    srv.on('login', async client => {
        if (options?.whitelist && !options.whitelist.includes(client.username) && !options.whitelist.includes(client.uuid)) 
            return client.end('You are not whitelisted.')
        if (!loggedIn) return client.end('You cannot spectate the bot until it has logged in.')
        handleClient(client, bot, srv, commandList, options?.spectatorsCanChat ?? true, options?.password)
    })

    bot._client.on('update_view_position', (data) => {
        srv.viewPosition = data
    })

    bot.on('end', (reason) => {
        for (const client of Object.values(srv.clients)) {
            client.end(`Mineflayer bot ended with reason: ${reason}`)
        }
        srv.close()
    })

    return { 
        port,
        close: () => srv.close(),
        get connectedSpectators() {
            return Object.values(srv.clients).map(c => c.username)
        },
        _server: srv,
        declareCommands: (commands: Command[]) => {
            commandList.push(...commands)
            const deepClone = JSON.parse(JSON.stringify(bot.registry.availableCommands))
            srv.writeAll('declare_commands', addCommandsToData(deepClone, commandList))
        }
    }
}

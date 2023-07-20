import { ServerClient } from "minecraft-protocol";
import mineflayer from "mineflayer";
import { sendLoadedChunks } from "./handlers/chunks";
import { sendPlayerList } from "./handlers/playerList";
import { sendLoadedEntities } from "./handlers/entities";
import prismarineChat from "prismarine-chat";
import { Command, addCommandsToData, commandsToData } from "./commands";
import { handleLogin } from "./server/login";
import { _Server } from "./types";

export async function handleClient(client: ServerClient, bot: mineflayer.Bot, server: _Server, commands: Command[], spectatorsCanChat: boolean, password?: string) {
    client.write('login', {
        ...bot.registry.loginPacket,
        worldType: 'minecraft:' + bot.game.dimension,
        worldName: 'minecraft:' + bot.game.dimension,
        entityId: 0,
        previousGameMode: -1,
        gameMode: 3 // Spectator
    })

    // @ts-ignore
    if (password && !await handleLogin(client, password, bot.game.height, bot.game.minY, bot.registry.loginPacket.viewDistance))  return

    if (server.viewPosition) client.write('update_view_position', server.viewPosition)
    await sendLoadedChunks(client, bot)

    client.write('position', {
        x: bot.entity.position.x,
        y: bot.entity.position.y,
        z: bot.entity.position.z,
        yaw: bot.entity.yaw,
        pitch: bot.entity.pitch,
        flags: 0,
        teleportId: 0
    })

    client.write('spawn_position', {
        location: bot.entity.position,
        angle: 0
    })

    sendPlayerList(client, bot)
    sendLoadedEntities(client, bot)

    client.write('update_time', {
        age: bot.time.age,
        time: bot.time.time
    })

    if (bot.registry.availableCommands) {
        // Not the most efficient but we don't do this very often 
        const deepClone = JSON.parse(JSON.stringify(bot.registry.availableCommands))
        client.write('declare_commands', addCommandsToData(deepClone, commands))
    }
    else client.write('declare_commands', commandsToData(commands))

    if (spectatorsCanChat) {
        client.on('chat_message', data => bot.chat(data.message))
        client.on('chat_command', data => {
            const command = data.command 
            const commandDeclaration = commands.find(c => c.name === command.split(' ')[0])
            if (commandDeclaration) commandDeclaration.handler(command, client)
            else bot.chat(`/${data.command}`)
        })
    }

    client.on('tab_complete', data => {
        if (data.text.startsWith('/')) {
            const args = data.text.slice(1).split(' ') as string[]
            const command = args.shift()
            const commandDeclaration = commands.find(c => c.name === command)
            if (!commandDeclaration) return bot._client.write('tab_complete', data)
            if (!commandDeclaration.arguments || commandDeclaration.arguments.length === 0) return

            const arg = commandDeclaration.arguments[args.length - 1]
            if (!arg || !arg.tabCompleteHandler) return 
            const matches = arg.tabCompleteHandler(data.text)
            client.write('tab_complete', {
                transactionId: data.transactionId,
                start: data.text.length - args[args.length - 1].length,
                length: args[args.length - 1].length,
                matches: matches.map(match => ({ match }))
            })
        }
        else bot._client.write('tab_complete', data)
    })

    sendWelcomeMsg(client)
}

function sendWelcomeMsg(client: ServerClient) {
    const { MessageBuilder } = prismarineChat(client.version)

    const dot = new MessageBuilder()
        .setText('●')
        .setColor('gray')

    const msg = new MessageBuilder()
        .setColor('yellow')
        .setText('Welcome to the Mineflayer-Spectator server!\n')
        .addExtra(
            dot,
            new MessageBuilder()
                .setText(' Source: https://github.com/PondWader/Mineflayer-Spectator\n')
                .setClickEvent('open_url', 'https://github.com/PondWader/Mineflayer-Spectator'),
            dot,
            new MessageBuilder()
                .setText(' Issues: https://github.com/PondWader/Mineflayer-Spectator/issues')
                .setClickEvent('open_url', 'https://github.com/PondWader/Mineflayer-Spectator/issues'),
            new MessageBuilder()
                .setText('\nThis project is currently a work in progress! Please report bugs if they are not already known.')
                .setColor('red')
                .setBold(true)
        )

    client.write('system_chat', {
        content: JSON.stringify(msg.toJSON()),
        isActionBar: false
    })
}

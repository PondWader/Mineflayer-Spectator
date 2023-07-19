import mineflayer from "mineflayer";
import { Command, _Server } from "../types";
import { addCommandsToData } from "../commands";

export function registerGeneralListeners(bot: mineflayer.Bot, server: _Server, commands: Command[]) {
    bot._client.on('declare_commands', data => {
        bot.registry.availableCommands = data
        const deepClone = JSON.parse(JSON.stringify(data))
        server.writeAll('declare_commands', addCommandsToData(deepClone, commands))
    })

    server.excludePacketFromProxy('game_state_change')
    bot._client.on('game_state_change', data => {
        // Blocking gamemode changes
        if (data.reason !== 3) server.writeAll('game_state_change', data)
    })
}
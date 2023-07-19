import { Command } from "../commands";
import mineflayer from "mineflayer";

export function createSpectatorTpCommand(bot: mineflayer.Bot): Command {
    return {
        name: 'spectatortp',
        handler: (cmd, client) => {
            const sendMsg = (msg: string, colour: string) => client.write('system_chat', {
                content: JSON.stringify({
                    text: msg,
                    color: colour
                }),
                isActionBar: false
            })

            const tp = (location: import('vec3').Vec3, yaw: number, pitch: number) => client.write('position', {
                ...location,
                yaw,
                pitch,
                flags: 0,
                teleportId: 0
            })

            const target = cmd.split(' ')[1]
            if (target) {
                const targetPlayer = Object.values(bot.players).find(p => p.username === target)
                if (!targetPlayer) return sendMsg('Invalid argument for player: cannot find player', 'red')
                const targetEntity = Object.values(bot.entities).find(e => e.username === targetPlayer.username)
                if (!targetEntity) return sendMsg('Invalid argument for player: player is not within range of the bot', 'red')
                tp(targetEntity.position, targetEntity.yaw, targetEntity.pitch)
            }
            else tp(bot.entity.position, bot.entity.yaw, bot.entity.pitch)

            sendMsg('Teleported!', 'aqua')
        },
        arguments: [{
            name: 'player',
            tabCompleteHandler: () => Object.values(bot.players).map(p => p.username)
        }]
    }
}
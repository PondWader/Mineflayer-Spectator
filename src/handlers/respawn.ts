import mineflayer from "mineflayer";
import { alignEntityId } from "./entities";
import { _Server } from "../types";

export function registerRespawnListener(bot: mineflayer.Bot, server: _Server) {
    server.excludePacketFromProxy('respawn')
    bot._client.on('respawn', async (data) => {
        server.writeAll('respawn', {
            ...data,
            gamemode: 3
        })
        const entity = bot.entity

        const needsTempTabList = !Object.values(bot.players).some(p => p.uuid === bot.player.uuid)
        if (needsTempTabList) {
            server.writeAll('player_info', {
                action: 17,
                data: [{
                    uuid: bot.player.uuid,
                    player: {
                        name: bot.player.username,
                        properties: bot.player.skinData ? [{
                            key: 'textures',
                            value: bot.player.skinData.model
                        }] : []
                    }
                }],
                displayName: bot.player.displayName
            })
        }
        
        server.writeAll('named_entity_spawn', {
            entityId: alignEntityId(entity.id),
            playerUUID: bot.player.uuid,
            ...entity.position,
            yaw: entity.yaw,
            pitch: entity.pitch
        })

        if (needsTempTabList) {
            server.writeAll('player_remove', {
                players: [bot.player.uuid]
            })
        }
    })
}
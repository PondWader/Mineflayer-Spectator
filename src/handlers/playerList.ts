import { ServerClient } from "minecraft-protocol";
import mineflayer from "mineflayer";

export function sendPlayerList(client: ServerClient, bot: mineflayer.Bot) {
    client.write('player_info', {
        action: 63,
        data: Object.values(bot.players).map(p => ({
            uuid: p.uuid,
            player: {
                name: p.username,
                properties: p.skinData ? [{
                    key: 'textures',
                    value: p.skinData.model
                }] : []
            },
            chatSession: undefined,
            gamemode: p.gamemode,
            listed: true,
            latency: p.ping,
            displayName: JSON.stringify(p.displayName.json)
        }))
    })

    // We have to add the player to the tab list so they can spectate through blocks
    client.write('player_info', {
        action: 1 + 4,
        data: [{
            uuid: client.uuid,
            player: {
                name: client.username,
                properties: []
            },
            gamemode: 3
        }]
    })

    client.write('playerlist_header', {
        header: JSON.stringify(bot.tablist.header.json),
        footer: JSON.stringify(bot.tablist.footer.json)
    })
}

import { ServerClient } from "minecraft-protocol";
import mineflayer from "mineflayer";
import { _Server } from "../types";
import { fixNbt } from "../utils";
import { PCChunk } from "prismarine-chunk";

type Chunk = PCChunk & {
    _spectatorData: any;
    blockEntities: any;
};;

export async function sendLoadedChunks(client: ServerClient, bot: mineflayer.Bot) {
    for (const worldColumn of bot.world.getColumns()) {
        const { chunkX, chunkZ } = worldColumn;
        const column = worldColumn.column as Chunk;

        const chunkData = {
            x: chunkX,
            z: chunkZ,
            heightmaps: { // For now we can just send a fake heightmap
                type: 'compound',
                name: '',
                value: {
                    MOTION_BLOCKING: { type: 'longArray', value: new Array(36).fill([0, 0]) }
                }
            },
            chunkData: column.dump(),
            blockEntities: Object.entries(column.blockEntities).map(([key, nbtData]) => {
                if (!column._spectatorData) {
                    console.log(`Mineflayer-Spectator: Missing _spectatorData for chunk at ${chunkX}, ${chunkZ}`)
                    return
                }
                if (!column._spectatorData.blockEntityTypes[key]) {
                    console.log(`Mineflayer-Spectator: Missing blockEntity type for block entity at ${key} in chunk at ${chunkX}, ${chunkZ}`)
                    return
                }
                const [x, y, z] = key.split(',').map(Number)
                return {
                    x,
                    y,
                    z,
                    type: column._spectatorData.blockEntityTypes[key],
                    nbtData: nbtData ? fixNbt(nbtData) : undefined
                }
            }).filter(e => e !== undefined),
            ...column.dumpLight()
        }

        client.write('map_chunk', chunkData)
    }
}

export function registerChunkListeners(bot: mineflayer.Bot, server: _Server) {
    bot._client.on('map_chunk', (data) => {
        if (data.blockEntities.length > 0) setImmediate(() => {
            for (const blockEntity of data.blockEntities) {
                const column = bot.world.getColumn(data.x, data.z) as Chunk;
                if (!column) {
                    console.log(`Mineflayer-Spectator: Something weird happened, could not find column in Mineflayer's world state at ${data.x}, ${data.z}`)
                    return
                }
                if (!column._spectatorData) column._spectatorData = { blockEntityTypes: {} }
                column._spectatorData.blockEntityTypes[`${blockEntity.x},${blockEntity.y},${blockEntity.z}`] = blockEntity.type
            }
        })
    })
    bot._client.on('tile_entity_data', (data) => {
        const column = bot.world.getColumnAt(data.location) as Chunk;
        if (!column._spectatorData) column._spectatorData = { blockEntityTypes: {} }
        column._spectatorData.blockEntityTypes[`${data.location.x % 16},${data.location.y},${data.location.z % 16}`] = data.action
    })
}

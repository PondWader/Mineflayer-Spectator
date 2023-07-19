import { ServerClient } from "minecraft-protocol";
import PrimsarineChunk from "prismarine-chunk";
import { Vec3 } from "vec3";

export function handleLogin(client: ServerClient, password: string, worldHeight: number, minY: number, viewDistance: number) {
    // Temporarily disable writing so that no packets are proxied
    const originalWrite = client.write
    const write = (name: string, params: any) => originalWrite.apply(client, [name, params])
    client.write = () => {} 

    return new Promise(resolve => {
        const spawnLoc = { x: 0, y: 0, z: 0 }

        const ChunkColumn = PrimsarineChunk(require('minecraft-data')(client.version))
        // @ts-ignore - Says there has to be data when there doesn't
        const column = new ChunkColumn({
            minY: minY,
            worldHeight
        }) as import('prismarine-chunk').PCChunk
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                for (let y = minY; y < worldHeight - Math.abs(minY); y++) {
                    column.setBlockType(new Vec3(x, y, z), 0)
                }
            }
        }

        for (let x = -viewDistance; x <= viewDistance; x++) {
            for (let z = -viewDistance; z <= viewDistance; z++) {
                write('map_chunk', {
                    x,
                    z,
                    heightmaps: { 
                        type: 'compound',
                        name: '',
                        value: {
                            MOTION_BLOCKING: { type: 'longArray', value: new Array(36).fill([0, 0]) }
                        }
                    },
                    chunkData: column.dump(),
                    blockEntities: [],
                    ...column.dumpLight()
                })
            }
        }


        write('position', {
            ...spawnLoc,
            yaw: 0,
            pitch: 0,
            flags: 0,
            teleportId: 0
        })
    
        write('spawn_position', {
            location: spawnLoc,
            angle: 0
        })
    
        write('system_chat', {
            content: JSON.stringify({
                text: 'This spectator server is password protected!\nPlease enter the password in chat:',
                color: 'red'
            }),
            isActionBar: false
        })
    
        const kick = (component: any) => {
            client.write('kick_disconnect', {
                reason: JSON.stringify(component)
            })
            client.end()
        }

        const listener: (data: { message: string }) => void = ({ message }) => {
            client.write = originalWrite
            if (message !== password) {
                kick({ text: 'Incorrect password!', color: 'red' })
                resolve(false)
            } else {
                write('system_chat', {
                    content: JSON.stringify({
                        text: 'Password correct! Loading...',
                        color: 'green'
                    }),
                    isActionBar: false
                })

                for (let x = -viewDistance; x <= viewDistance; x++) {
                    for (let z = -viewDistance; z <= viewDistance; z++) {
                        client.write('unload_chunk', {
                            chunkX: x,
                            chunkZ: z
                        })
                    }
                }

                resolve(true)
            }
            clearTimeout(passwordTimeout)
        }
        client.once('chat_message', listener)
        const passwordTimeout = setTimeout(() => {  
            client.write = originalWrite
            client.removeListener('chat_message', listener)
            kick({ text: 'You did not enter the password in time!', color: 'red' })
            resolve(false)
        }, 30_000)
    })
}
import { Server } from "minecraft-protocol"
import { Command } from "./commands"

export interface _Server extends Server {
    writeAll(packetName: string, data: any): void
    excludePacketFromProxy(...packet: string[]): void
    viewPosition: { chunkX: number, chunkZ: number }
}

export { Command }

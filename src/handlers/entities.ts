import { ServerClient } from "minecraft-protocol";
import mineflayer from "mineflayer";
import { _Server } from "../types";
import { toAngle } from "../utils";

// So that the spectator can take entity ID of 0, we shift all entity ids >= 0 up by 1
export const alignEntityId = <T extends number | { entityId: number }>(entity: T): T => {
    if (typeof entity === 'object') {
        entity = { ...entity } // We have to copy it so we don't meddle with the data Mineflayer is using
        entity.entityId = alignEntityId(entity.entityId)
        return entity
    }
    // @ts-expect-error - TypeScript doesn't seem to infer that this has to be a number
    return entity >= 0 ? entity + 1 : entity
}

const formatEntityMetadata = (entity: import('prismarine-entity').Entity, registry: any): any[] => {
    const metadata = entity.metadata
    const data: {
        key: number,
        type: string,
        value: any
    }[] = []
    if (!entity.name) return data;

    metadata.forEach((v, i) => {
        if (v === undefined) return;
        const metadataKeyTypes = registry.entitiesByName[entity.name!].metadataKeyTypes
        if (!metadataKeyTypes[i]) {
            console.log(`Mineflayer-Spectator: Missing metadata key type for ${registry.entitiesByName[entity.name!].metadataKeys[i]} (${i})`)
            return
        }
        data.push({
            key: i,
            type: metadataKeyTypes[i],
            value: v
        })
    })
    return data
}

export async function sendLoadedEntities(client: ServerClient, bot: mineflayer.Bot) {
    for (const entity of Object.values(bot.entities)) {
        if (entity.type === 'player') {
            const uuid = entity.uuid ?? Object.values(bot.players).find(p => p.username === entity.username)?.uuid
            if (!uuid) continue

            // If we're missing the UUID we need to temporarily add it to the tab list (it's probably an NPC)
            const isTempPlayer = !Object.values(bot.players).some(p => p.uuid === uuid) && entity.uuid && entity.username
            if (isTempPlayer) {
                client.write('player_info', {
                    action: 17,
                    data: [{
                        uuid: entity.uuid,
                        player: {
                            name: entity.username,
                            properties: []
                        }
                    }],
                    displayName: entity.displayName
                })
            }

            client.write('named_entity_spawn', {
                entityId: alignEntityId(entity.id),
                playerUUID: uuid,
                ...entity.position,
                yaw: toAngle(entity.yaw),
                pitch: toAngle(entity.pitch)
            })

            if (isTempPlayer) {
                client.write('player_remove', {
                    players: [entity.uuid]
                })
            }
        } else {
            if (!entity.entityType) continue
            // @ts-expect-error - _mineflayerSpectatorEntityTracker is an internal property not specified in types
            const entityUuidTracker = bot._mineflayerSpectatorEntityUuidTracker as Map<number, string>;

            client.write('spawn_entity', {
                entityId: alignEntityId(entity.id),
                objectUUID: entityUuidTracker.get(entity.id),
                type: entity.entityType,
                ...entity.position,
                pitch: toAngle(entity.pitch),
                yaw: toAngle(entity.yaw),
                // @ts-ignore
                headPitch: toAngle(entity.headPitch),
                // @ts-ignore
                objectData: entity.objectData,
                velocityX: entity.velocity.x,
                velocityY: entity.velocity.y,
                velocityZ: entity.velocity.z
            })
        }

        // @ts-ignore
        const vehicle = entity.vehicle as import('prismarine-entity').Entity | undefined
        if (vehicle) {
            client.write('attach_entity', {
                entityId: alignEntityId(entity.id),
                vehicleId: alignEntityId(vehicle.id)
            })
        }

        client.write('entity_metadata', {
            entityId: alignEntityId(entity.id),
            metadata: formatEntityMetadata(entity, bot.registry)
        })

        if (entity.equipment) entity.equipment.forEach((item, slot) => {
            if (!item) return
            client.write('entity_equipment', {
                entityId: alignEntityId(entity.id),
                equipments: [{
                    slot,
                    item: {
                        present: true,
                        itemId: item.type,
                        itemCount: item.count,
                        nbtData: item.nbt === null ? undefined : item.nbt
                    }
                }]
            })
        })
    }

    const botEquipment = [
        bot.heldItem, // Main hand
        bot.inventory.slots[45], // Off hand
        bot.inventory.slots[8], // Boots
        bot.inventory.slots[7], // Leggings
        bot.inventory.slots[6], // Chestplate
        bot.inventory.slots[5], // Helmet
    ]
    botEquipment.forEach((item, slot) => {
        if (!item) return
        client.write('entity_equipment', {
            entityId: alignEntityId(bot.entity.id),
            equipments: [{
                slot,
                item: {
                    present: true,
                    itemId: item.type,
                    itemCount: item.count,
                    nbtData: item.nbt
                }
            }]
        })
    })
}

export async function registerEntityListeners(bot: mineflayer.Bot, server: _Server) {
    // @ts-expect-error - _mineflayerSpectatorEntityTracker is an internal property not specified in types
    const entityUuidTracker = bot._mineflayerSpectatorEntityUuidTracker = new Map<number, string>();

    // Mineflayer doesn't track the UUID, so we must do it
    bot._client.on('spawn_entity', (data) => {
        entityUuidTracker.set(data.entityId, data.objectUUID);
    })

    bot._client.on('entity_destroy', (data) => {
        data = { ...data }
        data.entityIds = data.entityIds.map((entityId: number) => {
            entityUuidTracker.delete(entityId);
            return alignEntityId(entityId)
        })
        server.writeAll('entity_destroy', data)
    })
    bot._client.on('attach_entity', (data) => {
        data = { ...data }
        data.vehicleId = alignEntityId(data.vehicleId)
        server.writeAll('attach_entity', alignEntityId(data))
    })
    bot._client.on('set_passengers', data => {
        data = alignEntityId(data)
        data.passengers = data.passengers.map(alignEntityId)
        server.writeAll('set_passengers', data)
    })
    bot._client.on('damage_event', data => {
        data = alignEntityId(data)
        data.sourceCauseId = data.sourceDirectId === 0 ? 0 : alignEntityId(data.sourceCauseId)
        data.sourceDirectId = data.sourceDirectId === 0 ? 0 : alignEntityId(data.sourceDirectId)
        server.writeAll('damage_event', data)
    })
    server.excludePacketFromProxy('entity_destroy', 'attach_entity', 'set_passengers')

    const EVENTS_WITH_ALIGNED_IDS = [
        'entity_velocity',
        'spawn_entity',
        'named_entity_spawn',
        'rel_entity_move',
        'entity_look',
        'entity_move_look',
        'entity_teleport',
        'entity_metadata',
        'animation',
        'hurt_animation',
        'entity_status',
        'remove_entity_effect',
        'entity_head_rotation',
        'entity_equipment',
        'entity_sound_effect',
        'entity_update_attributes',
        'entity_effect',
        'spawn_entity_weather'
    ]
    server.excludePacketFromProxy(...EVENTS_WITH_ALIGNED_IDS)
    for (const event of EVENTS_WITH_ALIGNED_IDS) {
        bot._client.on(event, (data) => {
            server.writeAll(event, alignEntityId(data))
        })
    }

    // Populating metadataKeyTypes in the registry data for each entity the bot receives metadata for
    bot._client.on('entity_metadata', d => {
        const entity = bot.entities[d.entityId]
        if (!entity || !entity.name) return
        const entityData = bot.registry.entitiesByName[entity.name]
        if (!entityData.metadataKeyTypes) entityData.metadataKeyTypes = []

        for (const { key, type } of d.metadata) {
            entityData.metadataKeyTypes[key] = type
        }
    })

    if (!bot.inventory) await new Promise<void>(resolve => bot.once('login', resolve)) // bot.inventory won't be registered if the bot has just been created

    const SLOT_TO_EQUIPMENT_SLOT: { [x: number]: number } = {
        45: 1,
        8: 2,
        7: 3,
        6: 4,
        5: 5
    }
    bot.inventory.on('updateSlot', (oldItem, newItem) => {
        if (bot.heldItem) SLOT_TO_EQUIPMENT_SLOT[bot.heldItem.slot] = 0

        if (!oldItem && !newItem) return
        const slot = newItem ? newItem.slot : oldItem!.slot
        if (SLOT_TO_EQUIPMENT_SLOT[slot]) {
            server.writeAll('entity_equipment', {
                entityId: alignEntityId(bot.entity.id),
                equipments: [{
                    slot: SLOT_TO_EQUIPMENT_SLOT[slot],
                    item: newItem ? {
                        present: true,
                        itemId: newItem.type,
                        itemCount: newItem.count,
                        nbtData: newItem.nbt
                    } : { present: false }
                }]
            })
        }
    })
}

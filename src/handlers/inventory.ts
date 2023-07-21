import { ServerClient } from "minecraft-protocol";
import mineflayer from "mineflayer";

export async function sendInventory(client: ServerClient, bot: mineflayer.Bot) {
    client.write('window_items', {
        windowId: 0,
        stateId: 0,
        items: bot.inventory.slots.map(slot => slot === null ? 
            { present: false }
            : {
                present: true,
                itemId: slot.type,
                itemCount: slot.count,
                nbtData: slot.nbt
            }
        ),
        carriedItem: { present: false }
    })
}
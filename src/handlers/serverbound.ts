import mineflayer from "mineflayer"
import { alignEntityId } from "./entities";
import { _Server } from "../types";
import { toAngle } from "../utils";

export function loadServerboundInterceptor(bot: mineflayer.Bot, server: _Server) {
    const originalWrite = bot._client.write 
    bot._client.write = (name, params) => {
        switch (name) {
            case "position_look":
            case "position":
            case "look":
                server.writeAll('entity_teleport', {
                    ...bot.entity.position,
                    onGround: params.onGround,
                    yaw: toAngle(bot.entity.yaw),
                    pitch: toAngle(bot.entity.pitch),
                    entityId: alignEntityId(bot.entity.id)
                })
                break
                
        }

        originalWrite.apply(bot._client, [name, params])
    }
}
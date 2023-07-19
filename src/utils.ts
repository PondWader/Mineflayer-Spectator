// Remove null nbt values
export function fixNbt(nbt: any) {
    for (const key of Object.keys(nbt)) {
        if (nbt[key] === null) delete nbt[key]
        else if (typeof nbt[key] === 'object' && !Array.isArray(nbt)) fixNbt(nbt[key])
    }
}

export function toAngle(f: number) {
    let b = Math.floor((f % 360) * 256 / 360)
    if (b < -128) b += 256
    else if (b > 127) b -= 256
    return b
}

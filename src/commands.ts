type CommandNode = {
    flags: {
        unused: number,
        has_custom_suggestions: number,
        has_redirect_node: number,
        has_command: number,
        command_node_type: number
    },
    children: number[],
    extraNodeData?: {
        name?: string
        suggestionType?: string
        parser?: string
    }
}

type CommandData = {
    nodes: CommandNode[],
    rootIndex: number
}

export type Command = {
    name: string, 
    arguments?: {
        name: string,
        tabCompleteHandler?: (cmd: string) => string[],
        required?: boolean
    }[],
    handler: (cmd: string, client: import('minecraft-protocol').ServerClient) => void
}

function mergeCommandData(data: CommandData, newData: CommandData) {
    const rootNode = data.nodes[data.rootIndex]
    const newRootNode = newData.nodes[newData.rootIndex]

    rootNode.children.push(
        ...newRootNode.children.map(c => c + data.nodes.length)
    )
    newData.nodes.forEach(node => node.children = node.children.map(c => c + data.nodes.length))
    data.nodes.push(...newData.nodes)
}

export function commandsToData(commands: Command[]): CommandData {
    const newData: CommandData = {
        nodes: [
            {
                "flags": {
                    "unused": 0,
                    "has_custom_suggestions": 0,
                    "has_redirect_node": 0,
                    "has_command": 0,
                    "command_node_type": 0
                },
                "children": []
            }
        ],
        rootIndex: 0
    }

    for (const command of commands) {
        newData.nodes[0].children.push(newData.nodes.length)
        const commandNode: CommandNode = {
            "flags": {
                "unused": 0,
                "has_custom_suggestions": 0,
                "has_redirect_node": 0,
                "has_command": command.arguments ? command.arguments.some(a => a.required) ? 0 : 1 : 1,
                "command_node_type": 1
            },
            "children": [],
            "extraNodeData": {
                "name": command.name
            }
        }
        newData.nodes.push(commandNode)

        if (command.arguments) {
            let prevArg = commandNode
            const args = [...command.arguments]
            while (true) {
                const argument = args.shift()
                if (!argument) break

                prevArg.children.push(newData.nodes.length)
                const argNode = {
                    "flags": {
                        "unused": 0,
                        "has_custom_suggestions": argument.tabCompleteHandler ? 1 : 0,
                        "has_redirect_node": 0,
                        "has_command": args.some(a => a.required) ? 0 : 1,
                        "command_node_type": 2
                    },
                    "children": [],
                    "extraNodeData": {
                        "name": argument.name,
                        "parser": "minecraft:message",
                        "suggestionType": argument.tabCompleteHandler ? "minecraft:ask_server" : undefined
                    }
                }
                newData.nodes.push(argNode)

                prevArg = argNode
            }
        }
    }

    return newData
}

export function addCommandsToData(data: CommandData, commands: Command[]) {
    mergeCommandData(data, commandsToData(commands))
    return data
}
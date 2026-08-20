'use server'

import type { SqlParameter } from "@azure/cosmos"
import { format } from "date-fns"
import { cosmosClient } from "@/lib/cosmos"
import { getCurrentUserEmail } from "./user"
import type { Chat, ChatPatchKeys } from "./types"

const container = cosmosClient.database("travel").container("chats")

const isNotFound = (error: unknown) =>
    (error as { code?: number }).code === 404

/**
 * Patch-first upsert: an existing document gets only the requested fields
 * (plus `updatedAt`) patched; a 404 falls through to a create that stamps
 * the display name and `createdAt`. There is no separate create action.
 */
export async function postChat(
    partialChat: Partial<Chat>,
    patchKeys: ChatPatchKeys,
): Promise<Chat> {
    const email = await getCurrentUserEmail()
    const now = new Date().toISOString()
    const chat: Partial<Chat> = {
        ...partialChat,
        id: partialChat.id!,
        email,
        messages: partialChat.messages ?? [],
        state: partialChat.state,
        updatedAt: now,
    }

    try {
        const response = await container.item(chat.id!, email).patch<Chat>({
            operations: [...patchKeys, "updatedAt" as const].map((key) => ({
                op: "set",
                path: `/${key}`,
                value: chat[key],
            })),
        })
        if (!response.resource) {
            throw new Error(`Patching chat ${chat.id} returned no resource`)
        }
        return response.resource
    } catch (error) {
        if (isNotFound(error)) {
            const response = await container.items.create<Chat>({
                ...chat,
                name: `Trip ${format(new Date(), "d MMM yyyy, h:mm a")}`,
                createdAt: now,
            } as Chat)
            if (!response.resource) {
                throw new Error(`Creating chat ${chat.id} returned no resource`)
            }
            return response.resource
        }
        console.error("Failed to save chat", error)
        throw error
    }
}

/** Returns `undefined` when the chat does not exist (drives the not-found dialog). */
export async function getChat(id: string): Promise<Chat | undefined> {
    const email = await getCurrentUserEmail()
    try {
        const response = await container.item(id, email).read<Chat>()
        return response.resource
    } catch (error) {
        if (isNotFound(error)) {
            return undefined
        }
        console.error("Failed to read chat", error)
        throw error
    }
}

/** Most recently updated first; `top` caps the result count. */
export async function getChats(top?: number): Promise<Chat[]> {
    const email = await getCurrentUserEmail()
    try {
        const topClause = top !== undefined ? "TOP @limit " : ""
        const query = `SELECT ${topClause}* FROM c WHERE c.email = @partitionKey ORDER BY c.updatedAt DESC`
        const parameters: SqlParameter[] = [
            { name: "@partitionKey", value: email },
        ]
        if (top !== undefined) {
            parameters.push({ name: "@limit", value: top })
        }

        const response = await container.items
            .query<Chat>({ query, parameters }, { partitionKey: email })
            .fetchAll()
        return response.resources
    } catch (error) {
        console.error("Failed to list chats", error)
        throw error
    }
}

export async function deleteChat(id: string): Promise<boolean> {
    const email = await getCurrentUserEmail()
    try {
        await container.item(id, email).delete()
        return true
    } catch (error) {
        console.error("Failed to delete chat", error)
        throw error
    }
}

import type { Message } from "@ag-ui/client"
import type { TravelAgentState } from "@/lib/travel/agent-state"
import type { StoredTravelForm } from "../travel/schema"

/**
 * A persisted conversation. The document id is the CopilotKit thread id
 * and `email` is the Cosmos partition key (see `lib/chats/user.ts`).
 * `state` is the agent's itinerary snapshot so reopening a chat restores
 * the planner alongside the message history.
 */
export type Chat = {
    id: string
    email: string
    name: string
    messages: Message[]
    state?: TravelAgentState
    form?: StoredTravelForm
    createdAt: string
    updatedAt: string
}

export type ChatPatchKeys = Array<keyof Chat>

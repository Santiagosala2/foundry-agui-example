"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { deleteChat as deleteChatAction, getChats, postChat } from "@/lib/chats/actions"
import type { Chat, ChatPatchKeys } from "@/lib/chats/types"
import { Toaster } from "@/components/ui/toast"

type ChatPatch = Pick<Partial<Chat>, "messages" | "state">

interface ChatsContextType {
    chats: Chat[]
    isLoadingChats: boolean
    isDeletingChat: boolean
    isSavingChat: boolean
    fetchChats: () => Promise<void>
    saveChat: (id: string, patch: ChatPatch) => Promise<void>
    deleteChat: (id: string) => Promise<void>
}

const ChatsContext = createContext<ChatsContextType | null>(null)

/**
 * App-wide store for the persisted chat list. Mounted above both the sidebar
 * and the CopilotKit subtree (see app/layout.tsx) so a save triggered by a
 * finished agent run refreshes the sidebar's "Recent chats" immediately.
 * Methods rethrow after logging so callers can surface a toast; the Toaster
 * viewport is mounted here once for the whole app.
 */
export function ChatsProvider({ children }: { children: ReactNode }) {
    const [chats, setChats] = useState<Chat[]>([])
    const [isLoadingChats, setIsLoadingChats] = useState(false)
    const [isDeletingChat, setIsDeletingChat] = useState(false)
    const [isSavingChat, setIsSavingChat] = useState(false)

    const fetchChats = useCallback(async () => {
        setIsLoadingChats(true)
        try {
            setChats(await getChats(10))
        } catch (error) {
            console.error("Failed to fetch chats", error)
            throw error
        } finally {
            setIsLoadingChats(false)
        }
    }, [])

    const saveChat = useCallback(async (id: string, patch: ChatPatch) => {
        setIsSavingChat(true)
        try {
            const saved = await postChat({ id, ...patch }, Object.keys(patch) as ChatPatchKeys)
            setChats((current) => [saved, ...current.filter((chat) => chat.id !== saved.id)])
        } catch (error) {
            console.error("Failed to save chat", error)
            throw error
        } finally {
            setIsSavingChat(false)
        }
    }, [])

    const deleteChat = useCallback(async (id: string) => {
        setIsDeletingChat(true)
        try {
            await deleteChatAction(id)
            setChats((current) => current.filter((chat) => chat.id !== id))
        } catch (error) {
            console.error("Failed to delete chat", error)
            throw error
        } finally {
            setIsDeletingChat(false)
        }
    }, [])

    // Single initial load for the sidebar, deferred a tick so the effect body
    // stays free of synchronous state updates; errors are logged in fetchChats.
    useEffect(() => {
        const initialLoad = setTimeout(() => {
            fetchChats().catch(() => {})
        })
        return () => clearTimeout(initialLoad)
    }, [fetchChats])

    return (
        <ChatsContext.Provider
            value={{
                chats,
                isLoadingChats,
                isDeletingChat,
                isSavingChat,
                fetchChats,
                saveChat,
                deleteChat,
            }}
        >
            <Toaster />
            {children}
        </ChatsContext.Provider>
    )
}

export function useChats() {
    const context = useContext(ChatsContext)
    if (!context) {
        throw new Error("useChats must be used within a ChatsProvider")
    }
    return context
}

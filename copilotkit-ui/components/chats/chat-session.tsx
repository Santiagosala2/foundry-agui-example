"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AgentSubscriber, CopilotSidebar, useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2"
import TravelPlanner from "@/components/travel/travel-planner"
import { useChats } from "@/components/chats/chats-provider"
import { useAgentReady } from "@/hooks/use-agent-ready"
import { getChat } from "@/lib/chats/actions"
import type { TravelAgentState } from "@/lib/travel/agent-state"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"

/**
 * Chat orchestrator shared by `/` (new chat) and `/chat/[id]` (persisted
 * chat): restores a saved conversation into the agent once it is bound to
 * the URL's thread id, and persists every finished run back to Cosmos.
 */
export default function ChatSession({ threadId }: { threadId?: string }) {
    const { agent } = useAgent({
        agentId: "travel_agent",
        updates: [UseAgentUpdate.OnRunStatusChanged, UseAgentUpdate.OnStateChanged],
    })

    const { saveChat, fetchChats } = useChats()
    const router = useRouter()

    const [, startFetchingChat] = useTransition()
    const [openNotFoundDialog, setOpenNotFoundDialog] = useState(false)
    const isThreadFetchedRef = useRef(false)
    const isThreadSavedRef = useRef(false)
    // The hook reports not-ready for an empty id, so a new chat never fetches.
    const isAgentReady = useAgentReady(agent, threadId ?? "")

    // Restore a persisted chat once the agent carries the URL's thread id.
    useEffect(() => {
        if (!threadId || !isAgentReady || isThreadFetchedRef.current) return

        startFetchingChat(async () => {
            try {
                const chat = await getChat(threadId)
                if (chat) {
                    agent.setMessages(chat.messages)
                    // Hydrate the planner through agent state only: the
                    // use-agent-itinerary sync adopts it wholesale. Planner
                    // edits made before this async load resolves are
                    // overwritten — accepted, the load is fast and one-shot.
                    if (chat.state?.days) {
                        agent.setState(chat.state)
                    }
                } else {
                    setOpenNotFoundDialog(true)
                }
                isThreadFetchedRef.current = true
            } catch {
                toast.add({ description: "Something went wrong loading the chat", type: "error" })
            }
        })
    }, [isAgentReady, threadId, agent])

    // Persist messages plus the itinerary snapshot whenever a run completes.
    useEffect(() => {
        const subscriber: AgentSubscriber = {
            onRunFinalized: async (params) => {
                if (params.agent.messages.length === 0) return

                try {
                    await saveChat(params.agent.threadId, {
                        messages: params.agent.messages,
                        state: params.agent.state as TravelAgentState,
                    })
                    if (!isThreadSavedRef.current && !threadId) {
                        // First save of a new chat: adopt the canonical URL
                        // in place so the agent (and its messages) survive.
                        window.history.pushState(null, "", `/chat/${params.agent.threadId}`)
                        await fetchChats()
                    }
                    isThreadSavedRef.current = true
                } catch {
                    toast.add({ description: "Something went wrong saving the chat", type: "error" })
                }
            },
        }
        const { unsubscribe } = agent.subscribe(subscriber)
        return () => unsubscribe()
    }, [agent, threadId, saveChat, fetchChats])

    return (
        <>
            <NotFoundChatDialog
                open={openNotFoundDialog}
                onClose={() => {
                    setOpenNotFoundDialog(false)
                    router.push("/")
                }}
            />
            {!openNotFoundDialog && (
                <CopilotSidebar
                    labels={{
                        modalHeaderTitle: "Travel Itinerary Assistant",
                        welcomeMessageText: "Hi! Going somewhere, let's make a plan?",
                    }}
                    threadId={threadId}
                />
            )}
            <main className="flex flex-col min-h-20 w-full items-center justify-center p-6 gap-10">
                <TravelPlanner />
            </main>
        </>
    )
}

function NotFoundChatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>This chat is no longer available</DialogTitle>
                    <DialogDescription>
                        This chat was recently deleted
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-start">
                    <DialogClose render={<Button type="button" onClick={onClose}>Close</Button>} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

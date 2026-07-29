"use client";
import { useEffect, useRef } from "react";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { useItinerary } from "./use-itinerary";
import { fromAgentState, toAgentState, type TravelAgentState } from "@/lib/travel/agent-state";
import { sortActivities } from "@/lib/travel/itinerary";
import type { Day } from "@/lib/travel/types";

/**
 * `useItinerary` plus a two-way sync with the travel agent's shared state.
 * Local state stays the source of truth for edits (so typing is instant);
 * whole snapshots are exchanged with the agent, and a ref holding the last
 * synced snapshot suppresses echoes in both directions — no per-item diffing.
 */
export function useAgentItinerary(initialDays: Day[] = []) {
    const itinerary = useItinerary(initialDays)
    const { days, setDays } = itinerary

    const { agent } = useAgent({
        agentId: "travel_agent",
        updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
    })
    const agentState = agent.state as TravelAgentState | undefined

    const lastSyncedRef = useRef<string | null>(null)

    // Local edits (and the initial seed on mount) → agent.
    useEffect(() => {
        const snapshot = toAgentState(days)
        const serialized = JSON.stringify(snapshot)
        if (serialized === lastSyncedRef.current) return
        lastSyncedRef.current = serialized
        agent.setState(snapshot)
    }, [days, agent])

    // Agent snapshots/streamed deltas → local state, adopted wholesale.
    useEffect(() => {
        if (!agentState?.days) return
        const serialized = JSON.stringify(agentState)
        if (serialized === lastSyncedRef.current) return
        lastSyncedRef.current = serialized
        setDays(sortActivities(fromAgentState(agentState)))
    }, [agentState, setDays])

    return {
        ...itinerary,
        isRunning: agent.isRunning,
    }
}

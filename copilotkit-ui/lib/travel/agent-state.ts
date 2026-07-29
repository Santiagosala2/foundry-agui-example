import { sortDays } from "./itinerary";
import type { Day } from "./types";

/**
 * Shared state must survive a JSON round-trip to the agent, so `Day.date`
 * crosses the boundary as an ISO string and is revived on the way back.
 */
export type AgentDay = Omit<Day, "date"> & { date: string }

export type TravelAgentState = {
    days: AgentDay[]
}

export const toAgentState = (days: Day[]): TravelAgentState => ({
    days: days.map((day) => ({ ...day, date: day.date.toISOString() })),
})

export const fromAgentState = (state: TravelAgentState): Day[] =>
    state.days
        .map((day) => ({
            ...day,
            date: new Date(day.date),
            // Agent output is untrusted: never let an activity in without an id.
            activities: (day.activities ?? []).map((activity) => ({
                ...activity,
                id: activity.id || crypto.randomUUID(),
            })),
        }))
        .sort(sortDays)

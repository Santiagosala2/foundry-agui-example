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

const isValidDate = (date: Date) => !Number.isNaN(date.getTime())

export const toAgentState = (days: Day[]): TravelAgentState => ({
    days: days
        .filter((day) => isValidDate(day.date))
        .map((day) => ({ ...day, date: day.date.toISOString() })),
})

/**
 * Predictive state streams the agent's tool arguments while they are still
 * being generated, so a day can arrive with its `date` missing or truncated.
 * Such days are dropped; the next delta re-delivers them complete.
 */
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
        .filter((day) => isValidDate(day.date))
        .sort(sortDays)

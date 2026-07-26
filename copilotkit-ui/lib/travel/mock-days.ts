import type { Day } from "./types";

/** Seed data so the itinerary is not empty on first load. Remove once the agent drives state. */
export const MOCK_DAYS: Day[] = [
    {
        id: "australia-2024-04-12",
        date: new Date(),
        activities: [
            { id: "activity-1", description: "plan", time: "10:30:00" },
            { id: "activity-2", description: "", time: "14:00:00" },
        ],
    },
]

import type { Activity, Day } from "./types";

export const sortDays = (a: Day, b: Day) => a.date.getTime() - b.date.getTime()

/**
 * Rebuilds the day list for a date range, reusing any day already in `existing`
 * so activities the user typed survive a range change. Day ids are
 * `${country}-${isoDate}`, so switching country starts a fresh list.
 */
export function buildDays(existing: Day[], country: string, from?: Date, to?: Date): Day[] {
    if (!country || !from || !to) return existing

    const days: Day[] = []
    const current = new Date(from)
    const end = new Date(to)

    while (current <= end) {
        const dateKey = current.toISOString().split("T")[0]
        const dayId = `${country}-${dateKey}`
        const existingDay = existing.find((day) => day.id === dayId)

        days.push(
            existingDay ?? {
                id: dayId,
                date: new Date(current.toISOString()),
                activities: [],
            }
        )
        current.setDate(current.getDate() + 1)
    }

    return days.sort(sortDays)
}

export function updateActivity(
    days: Day[],
    dayId: string,
    activityId: string,
    patch: Partial<Activity>
): Day[] {
    return days.map((day) =>
        day.id !== dayId
            ? day
            : {
                ...day,
                activities: day.activities.map((activity) =>
                    activity.id !== activityId ? activity : { ...activity, ...patch }
                ),
            }
    )
}

export function addActivity(days: Day[], dayId: string, afterActivityId?: string): Day[] {
    const newActivity: Activity = { id: crypto.randomUUID(), description: "", time: "" }

    return days.map((day) => {
        if (day.id !== dayId) return day
        const index = afterActivityId
            ? day.activities.findIndex((activity) => activity.id === afterActivityId)
            : -1
        const activities = [...day.activities]
        activities.splice(index === -1 ? activities.length : index + 1, 0, newActivity)
        return { ...day, activities }
    })
}

export function removeActivity(days: Day[], dayId: string, activityId: string): Day[] {
    return days.map((day) =>
        day.id !== dayId
            ? day
            : {
                ...day,
                activities: day.activities.filter((activity) => activity.id !== activityId),
            }
    )
}

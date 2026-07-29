import type { Activity, Day } from "./types";

export const sortDays = (a: Day, b: Day) => a.date.getTime() - b.date.getTime()

/** Ascending order over `HH:mm:ss` strings, which compare lexicographically. */
const byTime = (a: Activity, b: Activity) => a.time.localeCompare(b.time)

/**
 * Orders each day's timed activities ascending while leaving untimed ones
 * (`time: ""`) in the slot they already occupy. Returns `days` unchanged when
 * nothing moves, so React can bail out of the re-render.
 */
export function sortActivities(days: Day[]): Day[] {
    let changed = false

    const next = days.map((day) => {
        const slots: number[] = []
        const timed: Activity[] = []

        day.activities.forEach((activity, index) => {
            if (!activity.time) return
            slots.push(index)
            timed.push(activity)
        })

        timed.sort(byTime)

        const activities = [...day.activities]
        let moved = false

        slots.forEach((slot, position) => {
            if (activities[slot] === timed[position]) return
            activities[slot] = timed[position]
            moved = true
        })

        if (!moved) return day
        changed = true
        return { ...day, activities }
    })

    return changed ? next : days
}

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

export function updateDay(days: Day[], dayId: string, activities: Activity[]): Day[] {
    return days.map((day) =>
        day.id !== dayId
            ? day
            : {
                ...day,
                activities: activities,
            }
    )
}
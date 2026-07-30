"use client";
import { useCallback, useState } from "react";
import * as itinerary from "@/lib/travel/itinerary";
import type { Activity, Day } from "@/lib/travel/types";

/**
 * Owns the itinerary state and binds the pure transitions in `lib/travel/itinerary`.
 * `setDays` is exposed so the agent can drive the itinerary directly.
 */
export function useItinerary(initialDays: Day[] = []) {
    const [days, setDays] = useState<Day[]>(initialDays)

    const syncDays = useCallback((country: string, city: string, range?: { from?: Date; to?: Date }) => {
        setDays((prev) => itinerary.buildDays(prev, country, city, range?.from, range?.to))
    }, [])

    const updateActivity = useCallback(
        (dayId: string, activityId: string, patch: Partial<Activity>) => {
            setDays((prev) => itinerary.updateActivity(prev, dayId, activityId, patch))
        },
        []
    )

    const addActivity = useCallback((dayId: string, afterActivityId?: string) => {
        setDays((prev) => itinerary.addActivity(prev, dayId, afterActivityId))
    }, [])

    const removeActivity = useCallback((dayId: string, activityId: string) => {
        setDays((prev) => itinerary.removeActivity(prev, dayId, activityId))
    }, [])

    const updateDay = useCallback((dayId: string, activities: Activity[]) => {
        setDays((prev) => itinerary.updateDay(prev, dayId, activities))
    }, [])


    /**
     * Puts each day's timed activities back in chronological order. Kept apart
     * from `updateActivity` so edits stay instant and the reorder only lands
     * once the user is done editing a time.
     */
    const commitActivityOrder = useCallback(() => {
        setDays(itinerary.sortActivities)
    }, [])

    return {
        days,
        setDays,
        syncDays,
        updateDay,
        updateActivity,
        addActivity,
        removeActivity,
        commitActivityOrder,
    }
}

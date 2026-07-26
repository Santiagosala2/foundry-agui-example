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

    const syncDays = useCallback((country: string, range?: { from?: Date; to?: Date }) => {
        setDays((prev) => itinerary.buildDays(prev, country, range?.from, range?.to))
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

    return { days, setDays, syncDays, updateActivity, addActivity, removeActivity }
}

import z from "zod";

export const travelFormSchema = z.object({
    country: z
        .string()
        .min(1, "Required"),
    city: z
        .string()
        .min(1, "Required"),
    // vibes: z
    //     .string()
    //     .min(1, "Required"),
    dateRange: z.object({
        from: z.date(),
        to: z.date()
    })
})

export type TravelFormValues = z.infer<typeof travelFormSchema>

/** What the form reports while the user is still filling it in — either field may be incomplete. */
export type TravelFormDraft = {
    country: string
    city: string
    dateRange?: { from?: Date; to?: Date }
}

/**
 * Persisted form values must survive a JSON round-trip to Cosmos, so the date
 * range crosses the boundary as ISO strings and is revived on the way back
 * (same shape of trade as `AgentDay` in `lib/travel/agent-state.ts`).
 */
export type StoredTravelForm = Omit<TravelFormValues, "dateRange"> & {
    dateRange: { from: string; to: string }
}

export const toStoredForm = (values: TravelFormValues): StoredTravelForm => ({
    ...values,
    dateRange: {
        from: values.dateRange.from.toISOString(),
        to: values.dateRange.to.toISOString(),
    },
})

export const fromStoredForm = (stored: StoredTravelForm): TravelFormValues => ({
    ...stored,
    dateRange: {
        from: new Date(stored.dateRange.from),
        to: new Date(stored.dateRange.to),
    },
})

export const TRAVEL_FORM_ID = "form-travel-itinerary"

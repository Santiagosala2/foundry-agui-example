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

export const TRAVEL_FORM_ID = "form-travel-itinerary"

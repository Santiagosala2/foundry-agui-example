"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "./ui/card";
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
    ComboboxValue,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Controller, useForm } from "react-hook-form"
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const countries = [
    { code: "", value: "", continent: "", label: "Select country" },
    {
        code: "ar",
        value: "argentina",
        label: "Argentina",
        continent: "South America",
    },
    { code: "au", value: "australia", label: "Australia", continent: "Oceania" },
    { code: "br", value: "brazil", label: "Brazil", continent: "South America" },
    { code: "ca", value: "canada", label: "Canada", continent: "North America" },
    { code: "cn", value: "china", label: "China", continent: "Asia" },
    {
        code: "co",
        value: "colombia",
        label: "Colombia",
        continent: "South America",
    },
    { code: "eg", value: "egypt", label: "Egypt", continent: "Africa" },
    { code: "fr", value: "france", label: "France", continent: "Europe" },
    { code: "de", value: "germany", label: "Germany", continent: "Europe" },
    { code: "it", value: "italy", label: "Italy", continent: "Europe" },
    { code: "jp", value: "japan", label: "Japan", continent: "Asia" },
    { code: "ke", value: "kenya", label: "Kenya", continent: "Africa" },
    { code: "mx", value: "mexico", label: "Mexico", continent: "North America" },
    {
        code: "nz",
        value: "new-zealand",
        label: "New Zealand",
        continent: "Oceania",
    },
    { code: "ng", value: "nigeria", label: "Nigeria", continent: "Africa" },
    {
        code: "za",
        value: "south-africa",
        label: "South Africa",
        continent: "Africa",
    },
    { code: "kr", value: "south-korea", label: "South Korea", continent: "Asia" },
    {
        code: "gb",
        value: "united-kingdom",
        label: "United Kingdom",
        continent: "Europe",
    },
    {
        code: "us",
        value: "united-states",
        label: "United States",
        continent: "North America",
    },
]

const formSchema = z.object({
    country: z
        .string()
        .min(1, "Required"),
    dateRange: z.object({
        from: z.date(),
        to: z.date()
    })

})

const formId = "form-travel-itinerary"

type Activity = {
    id: string;
    description: string;
    time: string
}

type Day = {
    id: string;
    date: Date;
    activities: Activity[]
}

const MOCK_DAYS: Day[] = [
    {
        id: "australia-2024-04-12",
        date: new Date(),
        activities: [
            { id: "activity-1", description: "plan", time: "10:30:00" },
            { id: "activity-2", description: "", time: "14:00:00" },
        ],
    },
]


const TravelItinerary = () => {
    const [days, setDays] = useState<Day[]>([])

    function updateActivity(dayId: string, activityId: string, patch: Partial<Activity>) {
        setDays((prev) =>
            prev.map((day) =>
                day.id !== dayId
                    ? day
                    : {
                        ...day,
                        activities: day.activities.map((activity) =>
                            activity.id !== activityId ? activity : { ...activity, ...patch }
                        ),
                    }
            )
        )
    }

    const getNewDays = (from: Date, to: Date) => {
        // if day alredy exists do not touch it
        const selectedCountry = form.getValues("country")
        const newDays: Day[] = []
        let current = new Date(from);
        const end = new Date(to);

        while (current <= end) {
            const dateKey = current.toISOString().split('T')[0]
            const dayId = `${selectedCountry}-${dateKey}`
            const foundDay = days.filter(d => d.id === dayId)
            const dayExists = foundDay.length > 0 ? foundDay[0] : null
            let addDay: Day;
            if (!dayExists) {
                const newDay: Day = {
                    id: dayId,
                    date: new Date(current.toISOString()),
                    activities: []
                }
                addDay = newDay;
            } else {
                addDay = dayExists
            }
            newDays.push(addDay);
            current.setDate(current.getDate() + 1);
        }
        return newDays
    }

    const sortDays = (a: Day, b: Day) => a.date.getTime() - b.date.getTime()



    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            country: "",
            dateRange: {
                from: undefined,
                to: undefined
            }
        },
    })


    function onSubmit(data: z.infer<typeof formSchema>) {

    }

    return (
        <div className="w-full flex flex-col gap-10 max-w-md">
            <Card>
                <CardContent>
                    <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldSet>
                            <FieldGroup>
                                <Controller
                                    name="country"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={formId}>
                                                Country
                                            </FieldLabel>
                                            <Combobox
                                                items={countries}
                                                value={field.value}
                                                onValueChange={(value) => {

                                                    field.onChange(value)
                                                    const dateRange = form.getValues("dateRange")
                                                    if (form.getValues("country")) {
                                                        setDays(getNewDays(dateRange.from, dateRange.to).sort(sortDays))
                                                    }
                                                }}
                                            >
                                                <ComboboxTrigger render={<Button variant="outline" className="w-64 justify-between font-normal"><ComboboxValue /></Button>} />
                                                <ComboboxContent>
                                                    <ComboboxInput showTrigger={false} placeholder="Search" />
                                                    <ComboboxEmpty>No countries found.</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(item) => (
                                                            <ComboboxItem key={item.code} value={item.value}>
                                                                {item.label}
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                            {/* {fieldState.invalid && <FieldError errors={[fieldState.error]} />} */}
                                        </Field>
                                    )} />
                                <Controller
                                    name="dateRange"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field orientation="horizontal" data-invalid={fieldState.invalid} >
                                            <FieldLabel htmlFor={formId}>Dates</FieldLabel>
                                            <Popover>
                                                <PopoverTrigger render={
                                                    <Button variant="outline" id={formId} className="w-64 justify-start font-normal"><CalendarIcon data-icon="inline-start" />{field.value.from ? (
                                                        field.value.to ? (
                                                            <>
                                                                {format(field.value.from, "LLL dd, y")} -{" "}
                                                                {format(field.value.to, "LLL dd, y")}
                                                            </>
                                                        ) : (
                                                            format(field.value.to, "LLL dd, y")
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}</Button>} />
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="range"
                                                        defaultMonth={field.value.from}
                                                        selected={field.value}
                                                        onSelect={(value) => {
                                                            field.onChange(value)

                                                            // calculate all the dates betwen from and to
                                                            const from = value?.from
                                                            const to = value?.to
                                                            if (from && to && form.getValues("country")) {
                                                                const newDays = getNewDays(from, to)
                                                                setDays(
                                                                    [
                                                                        ...newDays
                                                                    ].sort(sortDays)
                                                                )
                                                            }
                                                        }}
                                                        numberOfMonths={1}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </FieldSet>
                    </form>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button disabled={!form.formState.isValid} type="submit" form={formId}>
                        Plan
                    </Button>
                </CardFooter>
            </Card>
            <div className="flex flex-col gap-2">
                {days.map((day, i) => (
                    <Card key={day.id}>
                        <CardHeader>Day {i + 1}</CardHeader>
                        <CardContent className="flex flex-col gap-1">
                            {day.activities.map((activity) => (
                                <Card key={activity.id}>
                                    <CardContent className="grid grid-cols-6 items-start gap-4">
                                        <Textarea
                                            value={activity.description}
                                            onChange={(event) =>
                                                updateActivity(day.id, activity.id, {
                                                    description: event.target.value,
                                                })
                                            }
                                            placeholder="Add a plan…"
                                            rows={1}
                                            className="col-span-4 min-h-0 resize-none rounded-none border-transparent bg-transparent px-0 py-1 text-sm shadow-none transition-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                                        />
                                        <div className="col-span-2 justify-self-end">
                                            <Input
                                                type="time"
                                                id={`time-${activity.id}`}
                                                step="1"
                                                value={activity.time}
                                                onChange={(event) =>
                                                    updateActivity(day.id, activity.id, {
                                                        time: event.target.value,
                                                    })
                                                }
                                                className="w-30 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default TravelItinerary;




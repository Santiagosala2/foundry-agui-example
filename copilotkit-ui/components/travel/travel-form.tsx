"use client";
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { countries } from "@/lib/travel/countries"
import {
    TRAVEL_FORM_ID,
    travelFormSchema,
    type TravelFormDraft,
    type TravelFormValues,
} from "@/lib/travel/schema"
import { useEffect } from "react";

const DEFAULT_FORM_VALUES = {
    country: "",
    city: "",
    dateRange: {
        from: undefined,
        to: undefined
    }
}

type TravelFormProps = {
    /** Fires on every country/date change, including incomplete ones. */
    onValuesChange?: (values: TravelFormDraft) => void
    onSubmit?: (values: TravelFormValues) => void
    defaultFormData: TravelFormValues | undefined
}

const TravelForm = ({ defaultFormData, onValuesChange, onSubmit }: TravelFormProps) => {

    const form = useForm<TravelFormValues>({
        resolver: zodResolver(travelFormSchema),
        defaultValues: defaultFormData || DEFAULT_FORM_VALUES

    })

    // Derived rather than state, so a restored country lists its cities too.
    const selectedCountry = useWatch({ control: form.control, name: "country" })
    const cities = countries.find((c) => c.value === selectedCountry)?.mainCities ?? []

    // `defaultValues` only applies on the first render, but a restored chat
    // resolves its form asynchronously — reset once it arrives.
    useEffect(() => {
        if (defaultFormData) form.reset(defaultFormData)
    }, [defaultFormData, form])


    return (
        <Card>
            <CardContent>
                <form id={TRAVEL_FORM_ID} onSubmit={form.handleSubmit((values) => onSubmit?.(values))}>
                    <FieldSet>
                        <FieldGroup>
                            <Controller
                                name="country"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor={TRAVEL_FORM_ID}>
                                            Country
                                        </FieldLabel>
                                        <Combobox
                                            items={countries}
                                            value={field.value}
                                            onValueChange={(value) => {
                                                // the combobox clears to null; the schema expects a string
                                                const country = value ?? ""

                                                field.onChange(country)
                                                onValuesChange?.({
                                                    country,
                                                    city: form.getValues("city"),
                                                    dateRange: form.getValues("dateRange"),
                                                })
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
                            {<Controller
                                name="city"
                                control={form.control}
                                disabled={selectedCountry.length === 0}
                                render={({ field, fieldState }) => (
                                    <Field orientation="horizontal" data-invalid={fieldState.invalid} >
                                        <FieldLabel htmlFor={TRAVEL_FORM_ID}>
                                            City
                                        </FieldLabel>
                                        <Combobox
                                            items={cities}
                                            value={field.value}
                                            onValueChange={(value) => {
                                                // the combobox clears to null; the schema expects a string
                                                const city = value ?? ""
                                                field.onChange(city)
                                                onValuesChange?.({
                                                    country: form.getValues("country"),
                                                    city: city,
                                                    dateRange: form.getValues("dateRange"),
                                                })
                                            }}
                                        >
                                            <ComboboxTrigger render={<Button variant="outline" className="w-64 justify-between font-normal"><ComboboxValue /></Button>} />
                                            <ComboboxContent>
                                                <ComboboxInput showTrigger={false} placeholder="Search" />
                                                <ComboboxEmpty>No cities found.</ComboboxEmpty>
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
                                )} />}
                            <Controller
                                name="dateRange"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field orientation="horizontal" data-invalid={fieldState.invalid} >
                                        <FieldLabel htmlFor={TRAVEL_FORM_ID}>Dates</FieldLabel>
                                        <Popover>
                                            <PopoverTrigger render={
                                                <Button variant="outline" id={TRAVEL_FORM_ID} className="w-64 justify-start font-normal"><CalendarIcon data-icon="inline-start" />{field.value.from ? (
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
                                                        onValuesChange?.({
                                                            country: form.getValues("country"),
                                                            city: form.getValues("city"),
                                                            dateRange: value,
                                                        })
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
                <Button disabled={!form.formState.isValid} type="submit" form={TRAVEL_FORM_ID}>
                    Plan
                </Button>

            </CardFooter>
        </Card >
    )
}

export default TravelForm;

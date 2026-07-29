"use client";
import { useAgentItinerary } from "@/hooks/use-agent-itinerary";
import { MOCK_DAYS } from "@/lib/travel/mock-days";
import ItineraryDayList from "./itinerary-day-list";
import TravelForm from "./travel-form";

const TravelPlanner = () => {
    const { days, syncDays, addActivity, updateActivity, removeActivity, commitActivityOrder } =
        useAgentItinerary(MOCK_DAYS)

    return (
        <div className="w-full flex flex-col gap-10 max-w-md">
            <TravelForm onValuesChange={(values) => syncDays(values.country, values.dateRange)} />
            <ItineraryDayList
                days={days}
                onAddActivity={addActivity}
                onUpdateActivity={updateActivity}
                onRemoveActivity={removeActivity}
                onTimeCommit={commitActivityOrder}
            />
        </div>
    )
}

export default TravelPlanner;

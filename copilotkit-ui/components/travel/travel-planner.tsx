"use client";
import { useAgentItinerary } from "@/hooks/use-agent-itinerary";
import ItineraryDayList from "./itinerary-day-list";
import TravelForm from "./travel-form";
import { useAgent, UseAgentUpdate, useCopilotKit } from "@copilotkit/react-core/v2";

const TravelPlanner = () => {
    const { days, syncDays, addActivity, updateActivity, removeActivity, commitActivityOrder } =
        useAgentItinerary()

    const { agent } = useAgent({
        agentId: "travel_agent"
    })
    const { copilotkit } = useCopilotKit();

    const onSubmitForm = async () => {
        agent.addMessage({
            id: crypto.randomUUID(),
            role: "user",
            content: [
                {
                    type: "text",
                    text: "Please plan my trip",
                },
            ],
        });
        await copilotkit.runAgent({ agent });
    }


    return (
        <div className="w-full flex flex-col gap-10 max-w-md">
            <TravelForm onValuesChange={(values) => syncDays(values.country, values.city, values.dateRange)} onSubmit={onSubmitForm} />
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

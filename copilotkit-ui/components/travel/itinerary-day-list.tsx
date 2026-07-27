import ItineraryDayCard from "./itinerary-day-card"
import type { Activity, Day } from "@/lib/travel/types"

type ItineraryDayListProps = {
    days: Day[]
    onAddActivity: (dayId: string, afterActivityId?: string) => void
    onUpdateActivity: (dayId: string, activityId: string, patch: Partial<Activity>) => void
    onRemoveActivity: (dayId: string, activityId: string) => void
    onTimeCommit: () => void
}

const ItineraryDayList = ({
    days,
    onAddActivity,
    onUpdateActivity,
    onRemoveActivity,
    onTimeCommit,
}: ItineraryDayListProps) => (
    <div className="flex flex-col gap-2">
        {days.map((day, index) => (
            <ItineraryDayCard
                key={day.id}
                day={day}
                index={index}
                onAddActivity={onAddActivity}
                onUpdateActivity={onUpdateActivity}
                onRemoveActivity={onRemoveActivity}
                onTimeCommit={onTimeCommit}
            />
        ))}
    </div>
)

export default ItineraryDayList;

import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import ActivityCard from "./activity-card"
import type { Activity, Day } from "@/lib/travel/types"

type ItineraryDayCardProps = {
    day: Day
    index: number
    onAddActivity: (dayId: string, afterActivityId?: string) => void
    onUpdateActivity: (dayId: string, activityId: string, patch: Partial<Activity>) => void
    onRemoveActivity: (dayId: string, activityId: string) => void
    onTimeCommit: () => void
}

const ItineraryDayCard = ({
    day,
    index,
    onAddActivity,
    onUpdateActivity,
    onRemoveActivity,
    onTimeCommit,
}: ItineraryDayCardProps) => (
    <Card>
        <CardHeader>Day {index + 1}</CardHeader>
        <CardContent className="flex flex-col gap-3">
            {day.activities.length === 0 ? (
                <div className="flex justify-center py-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label="Add activity"
                        onClick={() => onAddActivity(day.id)}
                    >
                        <PlusIcon />
                    </Button>
                </div>
            ) : (
                day.activities.map((activity) => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onChange={(patch) => onUpdateActivity(day.id, activity.id, patch)}
                        onTimeCommit={onTimeCommit}
                        onAddAfter={() => onAddActivity(day.id, activity.id)}
                        onRemove={() => onRemoveActivity(day.id, activity.id)}
                    />
                ))
            )}
        </CardContent>
    </Card>
)

export default ItineraryDayCard;

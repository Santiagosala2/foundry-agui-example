import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Activity } from "@/lib/travel/types"

type ActivityCardProps = {
    activity: Activity
    onChange: (patch: Partial<Activity>) => void
    onTimeCommit: () => void
    onAddAfter: () => void
    onRemove: () => void
}

const ACTIVITY_TIME_ATTR = "data-activity-time"

/**
 * True while focus is moving straight to another activity's time field, where
 * committing the order would move that field out from under the cursor. The
 * commit is not lost — it runs when focus finally leaves the time fields.
 */
const movesToAnotherTimeField = (next: Element | null) =>
    Boolean(next?.closest(`[${ACTIVITY_TIME_ATTR}]`))

const ActivityCard = ({ activity, onChange, onTimeCommit, onAddAfter, onRemove }: ActivityCardProps) => (
    <div className="group/activity relative">
        <Card>
            <CardContent className="grid grid-cols-6 items-start gap-4">
                <Textarea
                    value={activity.description || ""}
                    onChange={(event) => onChange({ description: event.target.value })}
                    placeholder="Add a plan…"
                    rows={1}
                    className="col-span-4 min-h-0 resize-none rounded-none border-transparent bg-transparent px-0 py-1 text-sm shadow-none transition-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                />
                <div className="col-span-2 justify-self-end">
                    <Input
                        type="time"
                        id={`time-${activity.id}`}
                        step="1"
                        value={activity.time || ""}
                        onChange={(event) => onChange({ time: event.target.value })}
                        onBlur={(event) => {
                            if (movesToAnotherTimeField(event.relatedTarget)) return
                            onTimeCommit()
                        }}
                        {...{ [ACTIVITY_TIME_ATTR]: "" }}
                        className="w-30 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                </div>
            </CardContent>
        </Card>
        <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Add activity"
            onClick={onAddAfter}
            className="pointer-events-none absolute -bottom-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-hover/activity:pointer-events-auto group-hover/activity:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
        >
            <PlusIcon />
        </Button>
        <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Remove activity"
            onClick={onRemove}
            className="pointer-events-none absolute -top-2 -right-2 z-10 rounded-full opacity-0 transition-opacity group-hover/activity:pointer-events-auto group-hover/activity:opacity-100 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:pointer-events-auto focus-visible:opacity-100 dark:hover:border-destructive/40 dark:hover:bg-destructive/20 dark:hover:text-destructive"
        >
            <XIcon />
        </Button>
    </div>
)

export default ActivityCard;

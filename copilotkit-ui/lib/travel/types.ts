export type Activity = {
    id: string;
    description: string;
    time: string
}

export type Day = {
    id: string;
    date: Date;
    activities: Activity[]
}

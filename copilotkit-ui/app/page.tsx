"use client";
import TravelPlanner from "@/components/travel/travel-planner";
import { CopilotSidebar } from "@copilotkit/react-core/v2";



export default function Home() {

  return (
    <>
      <CopilotSidebar
        labels={{
          modalHeaderTitle: "Travel Itinerary Assistant",
          welcomeMessageText: "Hi! Going somewhere, let's make a plan?",

        }}
      />
      <main className="flex flex-col min-h-40 items-center justify-center p-6 gap-10" >
        <TravelPlanner />
      </main>
    </>
  );
}

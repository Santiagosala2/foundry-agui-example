"use client";
import TravelPlanner from "@/components/travel/travel-planner";
import { Card } from "@/components/ui/card";
import { CopilotSidebar, useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";



export default function Home() {

  const { agent } = useAgent({
    agentId: "sfwe_design_agent",
    updates: [UseAgentUpdate.OnStateChanged]
  });




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

// day 
// date
// index


// activities an array
// name and link


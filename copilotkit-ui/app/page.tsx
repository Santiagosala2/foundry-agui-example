"use client";
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
          modalHeaderTitle: "SFWE Design Assitant",
          welcomeMessageText: "Hi! Let's complete some MES documents together, shall we?",

        }}
      />
      <main className="flex flex-col min-h-40 items-center justify-center p-6 gap-10" >
        <Card>
          d
        </Card>
      </main>
    </>
  );
}

// day 
// date
// index


// activities an array
// name and link


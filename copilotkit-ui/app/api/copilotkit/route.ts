import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";
import { DefaultAzureCredential } from "@azure/identity";

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new ExperimentalEmptyAdapter();

const credential = new DefaultAzureCredential();

// Once deployed, the AGENT_URL should look like the one below
//AGUI_AGENT_URL=https://[foundry-resource-name].services.ai.azure.com/api/projects/[project-name]/agents/[agent-name]/endpoint/protocols/invocations?api-version=v1
const AGENT_URL =
  process.env.AGUI_AGENT_URL ?? "http://localhost:8088/invocations";

// 2. Create the CopilotRuntime instance and utilize the Microsoft Agent Framework
//    AG-UI integration to setup the connection.
const runtime = new CopilotRuntime({
  agents: {
    travel_agent: new HttpAgent({ url: AGENT_URL }),
  },
});

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {


  const headers: Record<string, string> = {};
  if (!AGENT_URL.includes("localhost")) {
    // Authenticate with the agent once deployed on Foundry, the app service should have Managed Identity turn on , and assign a Foundry User role
    const token = await credential.getToken("https://ai.azure.com/.default");
    headers["Authorization"] = `Bearer ${token.token}`;
    headers["Foundry-Features"] = "HostedAgents=V1Preview";
  }

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
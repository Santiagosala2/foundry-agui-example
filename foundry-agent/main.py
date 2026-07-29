from __future__ import annotations

import logging
import os
from collections.abc import AsyncGenerator

from ag_ui.core import RunErrorEvent
from ag_ui.encoder import EventEncoder
from agent_framework import Agent , Content, tool
from agent_framework.ag_ui import AgentFrameworkAgent
from agent_framework_ag_ui import AGUIRequest, state_update
from agent_framework.foundry import FoundryChatClient
from azure.ai.agentserver.invocations import InvocationAgentServerHost
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv
from starlette.requests import Request
from starlette.responses import StreamingResponse

from pydantic import BaseModel,Field

load_dotenv()

logger = logging.getLogger(__name__)
credential = DefaultAzureCredential()
    
class ActivityModel(BaseModel):
    id: str = Field(description="Stable id. Keep existing ids unchanged; use a new uuid4 for new activities.")
    description: str = Field(description="What the traveler will do.")
    time: str = Field(default="", description='24h "HH:MM:SS" time, or "" if unscheduled.')


class DayModel(BaseModel):
    id: str = Field(description='Day id in the form "<country>-<YYYY-MM-DD>". Never change existing ids.')
    date: str = Field(description="ISO 8601 date for the day.")
    activities: list[ActivityModel] = Field(default_factory=list)


class ItineraryState(BaseModel):
    days: list[DayModel] = Field(default_factory=list, description="The trip itinerary, one entry per day.")


@tool
def update_itinerary(days: list[DayModel]) -> Content:
    """Rewrite the trip itinerary.

    You MUST return the COMPLETE list of days, each with ALL of its activities,
    even when changing only one activity. Preserve every existing id; only
    generate new ids (uuid4) for activities you add. NEVER drop days or
    activities the user created - only modify or extend them.
    """
    # agent_framework passes tool arguments as raw dicts; validate explicitly.
    validated = ItineraryState.model_validate({"days": days})
    return state_update(text="Itinerary updated.", state=validated.model_dump())


# FOUNDRY_PROJECT_ENDPOINT is auto-injected in hosted Foundry containers;
# FOUNDRY_ENDPOINT is the local .env fallback.
endpoint = os.environ.get("FOUNDRY_PROJECT_ENDPOINT") or os.environ.get("FOUNDRY_ENDPOINT")
if not endpoint:
    raise RuntimeError("Set FOUNDRY_PROJECT_ENDPOINT or FOUNDRY_ENDPOINT.")

# AZURE_AI_MODEL_DEPLOYMENT_NAME is declared in azure.yaml for hosted deployments;
# FOUNDRY_MODEL is the local .env fallback.
model = os.environ.get("AZURE_AI_MODEL_DEPLOYMENT_NAME") or os.environ.get("FOUNDRY_MODEL")
if not model:
    raise RuntimeError("Set AZURE_AI_MODEL_DEPLOYMENT_NAME or FOUNDRY_MODEL.")

chat_client = FoundryChatClient(
    model=model,
    project_endpoint=endpoint,
    credential=credential,
)

agent = Agent(
    name="TravelAgent",
    instructions=(
        "You are a travel-planning assistant collaborating on a shared itinerary. "
        "The current itinerary is provided as application state. When asked to plan, "
        "add, or change activities, call update_itinerary with the complete updated "
        "itinerary. Keep all existing ids and days; times are 24h HH:MM:SS or empty."
    ),
    client=chat_client,
    default_options={"store": False},
    tools=[update_itinerary],
)

protocol_runner = AgentFrameworkAgent(
    agent=agent,
    # A schema is what turns on "Current state of the application" prompt injection.
    state_schema=ItineraryState,
    predict_state_config={"days": {"tool": "update_itinerary", "tool_argument": "days"}},
    require_confirmation=False,
)

app = InvocationAgentServerHost()


@app.invoke_handler
async def handle_invoke(request: Request) -> StreamingResponse:
    """Serve the AG-UI protocol over the Foundry invocations endpoint."""
    body = AGUIRequest.model_validate(await request.json())
    input_data = body.model_dump(exclude_none=True)

    async def event_stream() -> AsyncGenerator[str]:
        encoder = EventEncoder()
        try:
            async for event in protocol_runner.run(input_data):
                yield encoder.encode(event)
        except Exception as exc:
            logger.exception("Run failed while streaming events")
            yield encoder.encode(
                RunErrorEvent(
                    message="An internal error occurred while streaming events.",
                    code=type(exc).__name__,
                )
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    app.run()  # serves POST /invocations on :8088 (+ /readiness)
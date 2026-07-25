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
    
@tool
def update_form() -> Content:
    """Update the form with new or modified content.
    You MUST write the complete form with ALL fields, even when changing only a few fields.
    When modifying an existing form, include ALL existing data plus your changes.
    NEVER delete existing data - only modify it.
    Args:
        form: The complete form object with all details
    Returns:
        Confirmation that the form was updated
    """
    return state_update(text="form updated.", state={"form": form.model_dump()})


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
    name="MyAgent",
    instructions="You are a helpful assistant",
    client=chat_client,
    default_options={"store": False},
    tools=[update_form]
)

protocol_runner = AgentFrameworkAgent(
    agent=agent,
    state_schema={"form": {"type": "object", "description": "The mes form"}},
    predict_state_config={"form": {"tool": "update_form", "tool_argument": "form"}},
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
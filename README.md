# Foundry Hosted Agent + CopilotKit (AG-UI) example

A simple AI travel itinerary planner. You chat with an agent, and the plans it creates are written
into real UI components — not just chat text — so you can interact with them outside of the chat:
add, remove or update activities, and the agent sees your edits on the next turn.

I built this to answer:
how do you deploy a **Hosted Foundry Agent** while keeping AG-UI event compatibility, so a
CopilotKit frontend can talk to it? As of August 2026 there are no examples out there showing this
integration, and I wanted to save the community some time (and AI tokens) trying to find a
solution.

The short answer: **you don't need a proxy app in between**. The discussion proposes running a
separate AG-UI FastAPI app that forwards requests to the hosted agent, but Foundry's
**invocations protocol** already gives you raw control over the SSE stream, which is exactly what
AG-UI needs. `AgentFrameworkAgent` runs fine inside the hosted container — you just serve its
events yourself through the invocations handler.

## How it fits together

```
┌─────────────────────────────┐
│ copilotkit-ui (Next.js)     │
│  useAgent()                 │  @copilotkit/react-core/v2 — reacts to agent state
│  app/api/copilotkit/route.ts│  CopilotRuntime + HttpAgent (@ag-ui/client)
└──────────────┬──────────────┘
               │ AG-UI events over SSE
               ▼
┌─────────────────────────────┐
│ Foundry Hosted Agent        │
│  /invocations endpoint      │  InvocationAgentServerHost
│  AgentFrameworkAgent        │  AG-UI protocol layer (state, predictions)
│   └─ Agent                  │  name, instructions, tools
│       └─ FoundryChatClient  │  calls the Foundry model
└─────────────────────────────┘
```

## The agent (`foundry-agent/`)

Everything lives in [`main.py`](foundry-agent/main.py). There are three layers of wrapping:

1. A `FoundryChatClient` talks to the model deployment in your Foundry project.
2. It's wrapped in an `Agent` (from the `agent_framework` package), which is where the name,
   instructions and tools are configured.
3. That `Agent` is wrapped again in an `AgentFrameworkAgent` (from `agent_framework.ag_ui`), which
   adds the AG-UI-specific configuration: a `state_schema` (this is what turns on the "current
   state of the application" prompt injection) and `predict_state_config`, which streams state
   predictions to the UI *while* the tool call is still being generated — that's what makes the
   itinerary update live in the UI instead of appearing all at once.

The agent has one tool, `update_itinerary`, which returns a `state_update(...)` so the new
itinerary becomes the shared state. The Pydantic schema and the instructions insist on stable ids
so the UI can reconcile edits instead of re-rendering everything.

### Why the invocations protocol

Hosted agents can expose a few protocols ([docs](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents#which-protocol-should-i-use)).
The Responses protocol is OpenAI-compatible and platform-managed, but AG-UI is *not*
OpenAI-compatible — you need raw SSE control, and that's exactly what the invocations protocol is
for. Microsoft's own protocol table lists "Custom streaming protocol (AG-UI, etc.)" as an
invocations use case.

One important note: with the invocations protocol the SSE is raw, so you have to define the
streaming yourself with an `@app.invoke_handler` on `InvocationAgentServerHost()`. The handler
parses the request body as an `AGUIRequest`, runs it through the `AgentFrameworkAgent`, encodes
each event with the AG-UI `EventEncoder`, and yields them in a `text/event-stream` response
(with a `RunErrorEvent` fallback if something blows up mid-stream).

Two references I leaned on:

- [recipe_agent.py](https://github.com/microsoft/agent-framework/blob/main/python/packages/ag-ui/agent_framework_ag_ui_examples/agents/recipe_agent.py) — `AgentFrameworkAgent` with `predict_state_config` and shared state
- [foundry-samples invocations 01-basic](https://github.com/microsoft-foundry/foundry-samples/blob/main/samples/python/hosted-agents/agent-framework/invocations/01-basic/src/agent-framework-agent-basic-invocations/main.py) — the `invoke_handler` / SSE pattern

## The UI (`copilotkit-ui/`)

The CopilotKit runtime is initialized in
[`app/api/copilotkit/route.ts`](copilotkit-ui/app/api/copilotkit/route.ts). It registers an
`HttpAgent` (from `@ag-ui/client`) pointed at the agent's invocations endpoint. When the agent is
deployed (i.e. the URL isn't localhost), the route uses `DefaultAzureCredential` to get a token for
the `https://ai.azure.com/.default` scope and attaches it as a bearer header, plus a
`Foundry-Features: HostedAgents=V1Preview` header.

On the client side, [`hooks/use-agent-itinerary.ts`](copilotkit-ui/hooks/use-agent-itinerary.ts)
does the two-way shared-state sync with `useAgent` from `@copilotkit/react-core/v2`: local edits
are pushed to the agent with `agent.setState(...)`, agent snapshots (and streamed predictions) are
adopted into local state, and a ref with the last synced snapshot suppresses echoes in both
directions.

## Running it locally

You need to be logged in with `az login` — the agent uses `DefaultAzureCredential` to call the
model in your Foundry project even when running locally.

Create a `.env` file inside `foundry-agent/`:

```
FOUNDRY_ENDPOINT="https://[foundry-resource-name]/api/projects/[agent-name]"
FOUNDRY_MODEL="gpt-4.1"
```

Then start the agent — it serves `POST /invocations` on port 8088:

```bash
cd foundry-agent
pip install -r requirements.txt
python main.py
```

The UI needs no `.env` locally (it falls back to `http://localhost:8088/invocations`):

```bash
cd copilotkit-ui
npm install
npm run dev
```

## Deploying the agent to Foundry

Following the [hosted agent quickstart](https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=azd):

1. Install the [Azure Developer CLI](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd)
   and the Foundry extension: `azd ext install microsoft.foundry`
2. `cd` into `foundry-agent/`
3. Run `azd ai agent init` — this creates the `azure.yaml`
4. Run `azd provision`, then `azd deploy`

If you adapt this for your own project, make sure `requirements.txt` lists every package you use —
the deployment uses a remote build, so Azure installs your dependencies from that file.

A couple of things worth knowing about the deployed container: `azure.yaml` declares
`protocols: invocations`, and the env vars change — `FOUNDRY_PROJECT_ENDPOINT` is auto-injected by
the platform, and `AZURE_AI_MODEL_DEPLOYMENT_NAME` comes from `azure.yaml`. `main.py` checks those
first and falls back to the local `.env` values.

You can also test the agent before deploying with `azd ai agent run`, which opens the agent
inspector in your browser.

## Pointing the UI at the deployed agent

Go into the hosted agent's details in the Foundry portal and copy the invocations endpoint. Then
create a `.env` inside `copilotkit-ui/`:

```
AGUI_AGENT_URL="https://[foundry-resource-name].services.ai.azure.com/api/projects/[project-name]/agents/[agent-name]/endpoint/protocols/invocations?api-version=v1"
```

Whoever calls that endpoint needs the **Foundry User** RBAC role on the Foundry resource. Locally
that's you (via `az login`); if the UI runs on App Service or similar, turn on its managed
identity and assign the role to it.

## References

- [Hosted agents — which protocol should I use?](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents#which-protocol-should-i-use)
- [Quickstart: deploy your first hosted agent (azd)](https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=azd)
- [Agent Framework AG-UI recipe agent example](https://github.com/microsoft/agent-framework/blob/main/python/packages/ag-ui/agent_framework_ag_ui_examples/agents/recipe_agent.py)
- [Foundry samples — basic invocations agent](https://github.com/microsoft-foundry/foundry-samples/blob/main/samples/python/hosted-agents/agent-framework/invocations/01-basic/src/agent-framework-agent-basic-invocations/main.py)
- [The discussion that prompted this repo](https://github.com/microsoft/agent-framework/discussions/4720)

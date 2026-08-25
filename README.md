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

The second thing you hit right after wiring that up: **chat history**. The invocations protocol
stores no conversation history — Foundry only keeps raw session data (the sandbox's `$HOME` and
`/files`, deleted after 30 days of inactivity). The client is the source of truth for the
conversation, so this example persists chats (messages, shared state and even the travel form
values) in **Azure Cosmos DB**. See [Chat history with Cosmos DB](#chat-history-with-cosmos-db).

## How it fits together

```
┌─────────────────────────────┐
│ copilotkit-ui (Next.js)     │
│  useAgent()                 │  @copilotkit/react-core/v2 — reacts to agent state
│  app/api/copilotkit/route.ts│  CopilotRuntime + HttpAgent (@ag-ui/client)
│  lib/chats/actions.ts ──────┼──► Azure Cosmos DB — chat history (travel / chats)
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

## Chat history with Cosmos DB

### Why the UI has to own history

With the Responses protocol, Foundry manages conversation history for you: a conversation id is a
durable record of messages stored in the platform. **The invocations protocol has none of that.**
The only thing Foundry persists per session is the sandbox's raw state (`$HOME` and files uploaded
via `/files`), and even that is deleted after 30 days of inactivity — the
[sessions and conversations docs](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents#sessions-and-conversations)
are explicit that with invocations "you manage state in your own code", suggesting "in-memory,
Cosmos DB, etc.".

This fits how AG-UI works anyway: every request carries the *full* conversation (messages + shared
state) in its body, and the agent's `invoke_handler` in [`main.py`](foundry-agent/main.py) is
stateless — it even sets `default_options={"store": False}` so nothing is retained server-side.
Which means the browser's in-memory agent is the only copy of your chat: refresh the page and it's
gone. Cosmos DB fills exactly that gap.

### The data model

One document per chat, in database `travel`, container `chats`, partition key `/email`
([`lib/chats/types.ts`](copilotkit-ui/lib/chats/types.ts)):

```ts
export type Chat = {
    id: string            // the CopilotKit thread id
    email: string         // Cosmos partition key — who owns the chat
    name: string          // display name, e.g. "Trip 24 Aug 2026, 3:12 PM"
    messages: Message[]   // AG-UI messages (@ag-ui/client)
    state?: TravelAgentState   // itinerary snapshot (the shared state)
    form?: StoredTravelForm    // travel form values, dates as ISO strings
    createdAt: string
    updatedAt: string
}
```

Using the thread id as the document id and the user's email as the partition key means every read
is a cheap point read and every listing is a single-partition query.

### Saving

[`components/chats/chat-session.tsx`](copilotkit-ui/components/chats/chat-session.tsx) registers
an `AgentSubscriber` and saves on `onRunFinalized` — once per completed agent run, not per token.
It calls a **server action** ([`lib/chats/actions.ts`](copilotkit-ui/lib/chats/actions.ts)) that
does a patch-first upsert: patch only the changed fields (plus `updatedAt`), and fall through to a
create on 404 — there's no separate create action, and no `/api/chats` REST route either.

One subtlety: on the first save of a new chat the URL becomes `/chat/<threadId>` via
`window.history.pushState`, *not* `router.push` — a Next.js navigation would remount the tree and
throw away the in-memory agent mid-conversation.

### Restoring

Opening `/chat/[id]` mounts the same `ChatSession` component with the thread id from the URL.
CopilotKit binds that id to the agent asynchronously and mutates the agent object in place with no
event to subscribe to, so [`hooks/use-agent-ready.ts`](copilotkit-ui/hooks/use-agent-ready.ts)
polls until `agent.threadId` matches. Then the chat document is point-read and replayed:
`agent.setMessages(...)` restores the transcript, `agent.setState(...)` restores the itinerary,
and the travel form is reset from the stored values (`form.reset` in an effect — `defaultValues`
only applies on first render, and the chat resolves async). Unknown ids get a not-found dialog
that routes back home. The sidebar ([`components/nav-chats.tsx`](copilotkit-ui/components/nav-chats.tsx))
lists the 10 most recent chats by `updatedAt`.

### Who is the user

There's no sign-in in this example. [`lib/chats/user.ts`](copilotkit-ui/lib/chats/user.ts) exposes
`getCurrentUserEmail()`, which just returns `DEFAULT_USER_EMAIL` (default `demo@example.com`).
It's async on purpose: every server action resolves the partition key through it, so swapping in a
real session lookup (e.g. NextAuth's `auth()`) touches exactly one file.

### Setting up Cosmos DB

There's no infra-as-code for Cosmos in this repo, so create it once by hand (portal or CLI):

1. A Cosmos DB **NoSQL** account
2. A database named `travel`
3. A container named `chats` with partition key `/email`

The names are hardcoded in [`lib/chats/actions.ts`](copilotkit-ui/lib/chats/actions.ts). Auth is
environment-dependent ([`lib/cosmos.ts`](copilotkit-ui/lib/cosmos.ts)): in development the account
key (`COSMOS_KEY`) is used; in production the client switches to `DefaultAzureCredential`, which
needs the Cosmos DB **Built-in Data Contributor** data-plane role assigned to the app's identity.

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

The UI finds the local agent without configuration (it falls back to
`http://localhost:8088/invocations`), but it *does* need a `.env` for the chat history — see
[Setting up Cosmos DB](#setting-up-cosmos-db) for creating the `travel` database and `chats`
container. Create a `.env` inside `copilotkit-ui/`:

```
COSMOS_ENDPOINT="https://[your-cosmos-account].documents.azure.com:443/"
COSMOS_KEY="[account key — dev only; production uses DefaultAzureCredential]"
DEFAULT_USER_EMAIL="demo@example.com"
COPILOTKIT_TELEMETRY_DISABLED=true
```

Then start it:

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
add it to the `.env` inside `copilotkit-ui/` (keeping the Cosmos variables from above):

```
AGUI_AGENT_URL="https://[foundry-resource-name].services.ai.azure.com/api/projects/[project-name]/agents/[agent-name]/endpoint/protocols/invocations?api-version=v1"
```

Whoever calls that endpoint needs the **Foundry User** RBAC role on the Foundry resource. Locally
that's you (via `az login`); if the UI runs on App Service or similar, turn on its managed
identity and assign the role to it. The same identity story applies to the chat history: in
production drop `COSMOS_KEY` and give that managed identity the Cosmos DB **Built-in Data
Contributor** data-plane role instead.

## References

- [Hosted agents — which protocol should I use?](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents#which-protocol-should-i-use)
- [Hosted agents — sessions and conversations](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents#sessions-and-conversations) (why chat history is the client's job with invocations)
- [Quickstart: deploy your first hosted agent (azd)](https://learn.microsoft.com/en-us/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=azd)
- [Agent Framework AG-UI recipe agent example](https://github.com/microsoft/agent-framework/blob/main/python/packages/ag-ui/agent_framework_ag_ui_examples/agents/recipe_agent.py)
- [Foundry samples — basic invocations agent](https://github.com/microsoft-foundry/foundry-samples/blob/main/samples/python/hosted-agents/agent-framework/invocations/01-basic/src/agent-framework-agent-basic-invocations/main.py)
- [The discussion that prompted this repo](https://github.com/microsoft/agent-framework/discussions/4720)

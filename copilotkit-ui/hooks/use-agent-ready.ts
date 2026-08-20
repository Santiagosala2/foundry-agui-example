import { AbstractAgent } from "@ag-ui/client";
import { useEffect, useState } from "react";

/**
 * CopilotKit binds the URL's thread id to the agent asynchronously, so a
 * restored chat must not be fetched (or its messages applied) until
 * `agent.threadId` matches the id we intend to load. Polls because the
 * agent object is mutated in place — there is no event to subscribe to.
 * Returns `false` while waiting, and always for an empty `intendedThreadId`.
 */
export function useAgentReady(
  agent: AbstractAgent | null,
  intendedThreadId: string
): boolean {
  const [isReady, setIsReady] = useState(false);

  // Reset synchronously when the target thread changes (state-during-render
  // adjustment, per React docs) so a stale `true` never leaks across threads.
  const [lastThreadId, setLastThreadId] = useState(intendedThreadId);
  if (lastThreadId !== intendedThreadId) {
    setLastThreadId(intendedThreadId);
    setIsReady(false);
  }

  useEffect(() => {
    if (!agent || !intendedThreadId) return;

    const check = () => {
      if (agent.threadId === intendedThreadId) {
        setIsReady(true);
        clearInterval(interval);
      }
    };

    const interval = setInterval(check, 100);
    const immediate = setTimeout(check, 0);

    return () => {
      clearInterval(interval);
      clearTimeout(immediate);
    };
  }, [agent, intendedThreadId]);

  return isReady;
}

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * Singleton Cosmos DB client. Server-only — import it exclusively from
 * server actions / route handlers, never from a "use client" module.
 *
 * Dev authenticates with the account key (`COSMOS_KEY`); production uses
 * `DefaultAzureCredential` (managed identity), which needs the Cosmos DB
 * "Built-in Data Contributor" data-plane role. The instance is cached on
 * `global` in dev so Next.js hot reloads don't open a new connection per edit.
 */
const isProd = process.env.NODE_ENV === "production";

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

if (!endpoint) {
  throw new Error("COSMOS_ENDPOINT environment variable is missing.");
}

if (!isProd && !key) {
  throw new Error("COSMOS_KEY environment variable is missing.");
}

const globalForCosmos = global as unknown as { cosmosClient?: CosmosClient };

const clientConfig = isProd
  ? { endpoint, aadCredentials: new DefaultAzureCredential() }
  : { endpoint, key };

export const cosmosClient =
  globalForCosmos.cosmosClient ?? new CosmosClient(clientConfig);

if (!isProd) {
  globalForCosmos.cosmosClient = cosmosClient;
}

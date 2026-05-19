import type { ToolSet } from "ai";

// Tools available to the chat agent.
//
// Add a new tool by importing { tool } from "ai" and { z } from "zod" and
// registering it here, e.g.:
//
//   import { tool } from "ai";
//   import { z } from "zod";
//
//   export const chatTools = {
//     analyzeTicker: tool({
//       description: "Pull news + summary for a different ticker.",
//       inputSchema: z.object({ ticker: z.string() }),
//       execute: async ({ ticker }) => {
//         // ...
//       },
//     }),
//   } satisfies ToolSet;
//
// The route handler will register everything in this object automatically.
export const chatTools = {} satisfies ToolSet;

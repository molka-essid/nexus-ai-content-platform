import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/client";
import { toJsonSchema } from "@/lib/ai/to-json-schema";

export async function generateJSONWithAnthropic(input: {
  system: string;
  user: string;
  schema: z.ZodType;
  toolName: string;
  toolDescription: string;
  maxTokens: number;
}): Promise<unknown> {
  const response = await getAnthropicClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: input.maxTokens,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
    tools: [
      {
        name: input.toolName,
        description: input.toolDescription,
        // toJsonSchema always produces an object schema (our zod schemas are
        // all z.object(...) at the top level); Anthropic's SDK type just
        // requires that to be asserted explicitly.
        input_schema: toJsonSchema(input.schema) as Anthropic.Tool.InputSchema,
        strict: true,
      },
    ],
    tool_choice: { type: "tool", name: input.toolName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Claude did not return a structured response.");
  }

  return toolUse.input;
}

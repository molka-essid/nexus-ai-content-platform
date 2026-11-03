import { z } from "zod";

// Converts a zod schema into a plain JSON Schema object, so the same schema
// is the single source of truth for both the structured-output request sent
// to whichever LLM provider is active (Anthropic tool-use `input_schema`,
// Gemini `responseJsonSchema`) and the validation applied to its response.
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

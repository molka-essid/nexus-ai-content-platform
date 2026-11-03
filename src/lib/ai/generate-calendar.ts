import "server-only";
import { generateJSON } from "@/lib/ai/generate-json";
import { buildCalendarPrompt } from "@/lib/ai/prompts/calendar";
import {
  calendarGenerationSchema,
  type GenerateCalendarInput,
  type CalendarGeneration,
} from "@/lib/ai/schemas";
import { getBrandProfile } from "@/lib/data/brand";
import { prisma } from "@/lib/db/prisma";
import { AIRequestType } from "@prisma/client";

const TOOL_NAME = "return_calendar";
const TOOL_DESCRIPTION = "Return the generated weekly calendar in the required structured format.";

export async function generateCalendar(
  input: GenerateCalendarInput,
  requestedById?: string,
): Promise<CalendarGeneration> {
  const brand = await getBrandProfile();
  const { system, user } = buildCalendarPrompt(input, brand);
  const allowedPlatforms = new Set(input.platforms);

  const generation = await generateJSON({
    system,
    user,
    schema: calendarGenerationSchema,
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    maxTokens: 8192,
    // Unlike a missing platform variant on a single publication, a missing
    // *entire post* can't be safely fabricated without another AI call — so
    // a provider that gets the count or platform pool wrong is treated as
    // having failed this attempt, and the chain retries the next provider,
    // rather than silently shipping a different plan than what was asked
    // for.
    validate: (parsed) => {
      const result = parsed as CalendarGeneration;
      if (result.slots.length !== input.postsPerWeek) {
        return `produced ${result.slots.length} posts, expected exactly ${input.postsPerWeek}`;
      }
      const offPlatform = result.slots.find((slot) => !allowedPlatforms.has(slot.platform));
      if (offPlatform) {
        return `used platform ${offPlatform.platform}, which wasn't in the requested selection`;
      }
      return true;
    },
  });

  await prisma.aIGenerationLog.create({
    data: {
      requestType: AIRequestType.CALENDAR,
      inputParams: input,
      rawResponse: generation,
      requestedById,
    },
  });

  return generation;
}

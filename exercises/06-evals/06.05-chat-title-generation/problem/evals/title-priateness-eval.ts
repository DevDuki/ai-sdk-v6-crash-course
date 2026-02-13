import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { createScorer } from 'evalite';
import z from 'zod';

export const titlePiratenessEval = createScorer({
  name: 'Pirateness',
  scorer: async ({ input, output }) => {
    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: `
        You are a helpful assistant that can grade a title given for a paragraph and determine whether it sounds like a pirate gave the title or not.

        Your job is to work out if the title sounds pirate-y.

        Reply with a score of A, B, C or D.

        A: Sounds like a real pirate!
        B: Could be from a pirate newbie.
        C: Only some words sound pirate-y but it doesn't draw me in.
        D: No pirate flair at all.
      `,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The answer you are evaluating is:

              ${output}

              The original paragraph was:

              ${input}`,
            },
          ],
        },
      ],
      schema: z.object({
        feedback: z
          .string()
          .describe(
            'A short feedback message about the answer.',
          ),
        score: z.enum(['A', 'B', 'C', 'D']),
      }),
    });

    const scoreMap = {
      A: 1,
      B: 0.5,
      C: 0,
      D: 0,
    };

    return {
      score: scoreMap[result.object.score],
      metadata: result.object.feedback,
    };
  }
})

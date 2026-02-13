import { google } from '@ai-sdk/google';
import { Output, streamText } from 'ai';
import z from 'zod';

const model = google('gemini-2.5-flash');

const stream = streamText({
  model,
  prompt:
    'Give me the first paragraph of a story about an imaginary planet.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const finalText = await stream.text;

// TODO: Replace this with a call to generateText, passing:
// - The model, same as above
// - The prompt, asking for facts about the imaginary planet,
//   passing in the finalText as the story
// - The output, which should be Output.object({}), passing
//   the schema: z.object({
//     facts: z.array(z.string()).describe('The facts about the imaginary planet. Write as if you are a scientist.'),
//   })
const factsResult = await ({
  model,
  prompt:
    'Give me some facts about the planet mentioned in the following text. Also if you can count how many different' +
    ' animals live on that planet and how many plants exist on that planet:' +
    finalText,
  output: Output.object({
    schema: z.object({
      facts: z
        .array(z.string())
        .describe(
          'The facts about the imaginary planet. Write as if you are a scientist.',
        ),
      numberOfAnimals: z.number(),
      numberOfFlora: z.number()
    }),
  }),
});

// TODO: Log the output of the result
console.log(factsResult.output);

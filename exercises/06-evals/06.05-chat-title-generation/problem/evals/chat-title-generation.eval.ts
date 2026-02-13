import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { titlePiratenessEval } from './title-priateness-eval.ts';

const csvFile = readFileSync(
  path.join(import.meta.dirname, '../../titles-dataset.csv'),
  'utf-8',
);

const data = Papa.parse<{ Input: string; Output: string }>(
  csvFile,
  {
    header: true,
    skipEmptyLines: true,
  },
);

const EVAL_DATA_SIZE = 5;

const dataForEvalite = data.data
  .slice(0, EVAL_DATA_SIZE)
  .map((row) => ({
    input: row.Input,
    expected: row.Output,
  }));

evalite('Chat Title Generation', {
  data: () => dataForEvalite,
  task: async (input) => {
    const result = await generateText({
      model: google('gemini-2.5-flash-lite'),
      prompt: `
      <task-context>
        You will be acting as an AI Assistant that gives me clear concise titles for a paragraph
      </task-context>
      
      <rules>
        Here are some important rules for the interaction:
        - Keep the title short, at max 150 characters
        - Add a teensy weensy pirate jargon in it. But max for 1 word
      </rules>
      
      <the-ask>
        Generate me a title for the following paragraph:
        ${input}
      </the-ask>
      
      <output-formatting>
        Only reply with the title that you came up with. Only one title.
      </output-formatting>
      `,
    });

    return result.text;
  },
  scorers: [
    {
      name: 'Output length',
      scorer: ({ output }) => {
        return output.length < 150 ? 1 : 0;
      }
    },
    titlePiratenessEval
  ],
});

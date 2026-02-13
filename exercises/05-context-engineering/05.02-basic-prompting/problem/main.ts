import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const INPUT = `Do some research on induction hobs and how I can replace a 100cm wide AGA cooker with an induction range cooker. Which is the cheapest, which is the best?`;

// NOTE: A good output would be: "Induction hobs vs AGA cookers"

const result = await streamText({
  model: google('gemini-2.5-flash-lite'),
  // TODO: Rewrite this prompt using the Anthropic template from
  // the previous exercise.
  // You will NOT need all of the sections from the template.
  prompt: `
    <task-context>
  You are a Chats manager. Your task is to keep chats well organised for the user to find them easily later on. The best way to do that is giving a good title for the chat, which reflects the content to some degree
</task-context>

<the-ask>
  Here is the first message of the chat that I need a title for:
  <question>
  ${INPUT}
  </question>
  What title would would you give to this chat?
</the-ask>

<thinking-instructions>
  Think about your answer first before you respond. Make it not too long, so all the chats are quickly scannable for the user, but don't make it too short which would risk losing any meaning to the title.
</thinking-instructions>

<output-formatting>
  Put your response in <response></response> tags.
</output-formatting>
  `,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

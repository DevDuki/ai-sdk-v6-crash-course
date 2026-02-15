import { google } from '@ai-sdk/google';
import { convertToModelMessages, generateText, streamText, type UIMessage } from 'ai';

const formatMessageHistory = (messages: UIMessage[]) => {
  return messages
    .map((message) => {
      return `${message.role}: ${message.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text;
          }

          return '';
        })
        .join('')}`;
    })
    .join('\n');
};

const WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM = `You are writing a Slack message for a user based on the conversation history. Only return the Slack message, no other text.`;
const EVALUATE_SLACK_MESSAGE_SYSTEM = `You are evaluating the Slack message produced by the user.

  Evaluation criteria:
  - The Slack message should be written in a way that is easy to understand.
  - It should be appropriate for a professional Slack conversation.
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text.
`;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const writeSlackResult = await generateText({
    model: google('gemini-2.0-flash-lite'),
    system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
    prompt: `
      Conversation history:
      ${formatMessageHistory(messages)}
    `
  }); // Write Slack message

  const evaluateSlackResult = await generateText({
    model: google('gemini-2.0-flash-lite'),
    system: EVALUATE_SLACK_MESSAGE_SYSTEM,
    prompt: `
      Conversation history:
      ${formatMessageHistory(messages)}
      
      Slack message draft:
      ${writeSlackResult.text}
    `,
  }); // Evaluate Slack message

  const finalSlackAttempt = streamText({
    model: google('gemini-2.0-flash-lite'),
    system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
    prompt: `
      Conversation history:
      ${formatMessageHistory(messages)}
      
      Slack message draft:
      ${writeSlackResult.text}
      
      Slack message feedback:
      ${evaluateSlackResult.text}
    `,
  }); // Write final Slack message

  return finalSlackAttempt.toUIMessageStreamResponse();
};

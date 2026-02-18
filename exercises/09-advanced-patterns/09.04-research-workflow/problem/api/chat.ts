import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamObject,
  streamText,
  type ModelMessage,
  type UIMessage,
  type UIMessageStreamWriter,
  Output,
} from 'ai';
import { tavily } from '@tavily/core';
import z from 'zod';

export type MyMessage = UIMessage<
  unknown,
  {
    queries: string[];
    plan: string;
  }
>;

const generateQueriesForTavily = (
  modelMessages: ModelMessage[],
) => {
  // TODO: Use streamObject to generate a plan for the search,
  // AND the queries to search the web for information.
  // The plan should identify the groups of information required
  // to answer the question.
  // The plan should list pieces of information that are required
  // to answer the question, then consider how to break down the
  // information into queries.
  // Generate 3-5 queries that are relevant to the conversation history.
  // Reply as a JSON object with the following properties:
  // - plan: A string describing the plan for the queries.
  // - queries: An array of strings, each representing a query.
  const queriesResult = streamText({
    model: google('gemini-2.5-flash-lite'),
    output: Output.object({
      schema: z.object({
        plan: z.string().describe('A plan for the search'),
        queries: z.array(z.string()).describe('The queries to search the web for information')
      }),
    }),
    prompt: `
      You are an assistant for doing thorough researches on a specific topic.
      Based on the user's messages create a plan on how to gather information and generate 3-5 queries that are relevant to the topic
    `
  });

  return queriesResult;
};

const displayQueriesInFrontend = async (
  queriesResult: ReturnType<typeof generateQueriesForTavily>,
  writer: UIMessageStreamWriter<MyMessage>,
) => {
  const queriesPartId = crypto.randomUUID();
  const planPartId = crypto.randomUUID();

  for await (const part of queriesResult.partialOutputStream) {
    // TODO: Stream the queries and plan to the frontend
    writer.write({
      type: 'data-plan',
      data: part.plan ?? '',
      id: planPartId
    });

    writer.write({
      type: 'data-queries',
      data: part.queries?.filter((query): query is string => !!query) ?? [],
      id: queriesPartId
    })
  }
};

const callTavilyToGetSearchResults = async (
  queries: string[],
) => {
  const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const searchResults = await Promise.all(
    queries.map(async (query) => {
      const response = await tavilyClient.search(query, {
        maxResults: 5,
      });

      return {
        query,
        response,
      };
    }),
  );

  return searchResults;
};

const streamFinalSummary = async (
  searchResults: Awaited<
    ReturnType<typeof callTavilyToGetSearchResults>
  >,
  messages: ModelMessage[],
  writer: UIMessageStreamWriter<MyMessage>,
) => {
  // TODO: Use streamText to generate a final response to the user.
  // The response should be a summary of the search results,
  // and the sources of the information.
  const answerResult = streamText({
    model: google('gemini-2.5-flash-lite'),
    system: `
      You are an assistant that summarises some research results into easy to understand paragraphs.
      
      The following were the search results:
      ${searchResults.map(result => `
        <searchResult>${result.response.answer}</searchResult>      
      `)}
    `,
    prompt: messages,
  });

  writer.merge(
    // NOTE: We send sendStart: false because we've already
    // sent the 'start' message part to the frontend.
    answerResult.toUIMessageStream({ sendStart: false }),
  );
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const queriesResult =
        generateQueriesForTavily(modelMessages);

      await displayQueriesInFrontend(queriesResult, writer);

      const scrapedPages = await callTavilyToGetSearchResults(
        (await queriesResult.output).queries,
      );

      await streamFinalSummary(
        scrapedPages,
        modelMessages,
        writer,
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};

import { devToolsMiddleware } from '@ai-sdk/devtools';
import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
  wrapLanguageModel,
} from 'ai';
import { z } from 'zod';
import {
  createDirectory,
  deletePath,
  listDirectory,
  readFile,
  searchFiles,
  writeFile,
} from './file-system-functionality.ts';

const model = wrapLanguageModel({
  model: google('gemini-2.5-flash'),
  middleware: devToolsMiddleware(),
});

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use a sandboxed file system to create, edit and delete files.

      You have access to the following tools:
      - writeFile
      - readFile
      - deletePath
      - listDirectory
      - createDirectory
      - exists
      - searchFiles

      Use these tools to record notes, create todo lists, and edit documents for the user.

      Use markdown files to store information.
    `,
    // TODO: add the tools to the streamText call,
    tools: {
      writeFile: tool({
        description: 'Write files to the sandboxed file system',
        inputSchema: z.object({
          filePath: z.string(),
          content: z.string(),
        }),
        execute: ({ filePath, content }) => {
          return writeFile(filePath, content);
        },
      }),
      readFile: tool({
        description: 'Read content from a file',
        inputSchema: z.object({
          filePath: z.string(),
        }),
        execute: ({ filePath }) => {
          return readFile(filePath);
        },
      }),
      deletePath: tool({
        description: 'Delete a file or directory',
        inputSchema: z.object({
          pathToDelete: z.string(),
        }),
        execute: ({ pathToDelete }) => {
          return deletePath(pathToDelete);
        },
      }),
      listDirectory: tool({
        description: 'List contents of a directory',
        inputSchema: z.object({
          dirPath: z.string(),
        }),
        execute: ({ dirPath }) => {
          return listDirectory(dirPath);
        },
      }),
      createDirectory: tool({
        description: 'Create a directory',
        inputSchema: z.object({
          dirPath: z.string(),
        }),
        execute: ({ dirPath }) => {
          return createDirectory(dirPath);
        },
      }),
      exists: tool({
        description: 'Check if a file or directory exists',
        inputSchema: z.object({
          pathToCheck: z.string(),
        }),
        execute: ({ pathToCheck }) => {
          return createDirectory(pathToCheck);
        },
      }),
      searchFiles: tool({
        description:
          'Search for files by pattern (simple glob-like search)',
        inputSchema: z.object({
          pattern: z.string(),
          searchDir: z.string(),
        }),
        execute: ({ pattern, searchDir }) => {
          return searchFiles(pattern, searchDir);
        },
      }),
    },
    // TODO: add a custom stop condition to the streamText call
    // to force the agent to stop after 10 steps have been taken
    stopWhen: ({ steps }) => steps.length === 5,
  });

  return result.toUIMessageStreamResponse();
};

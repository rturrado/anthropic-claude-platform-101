import Anthropic from '@anthropic-ai/sdk';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// The todo list is client-side state Claude reads and mutates through tools;
// the API never sees this array, only the strings runTool returns.
type Todo = { id: number; text: string; done: boolean };
const todos: Todo[] = [];
let nextId = 1;

// The tools catalog: Claude reads names, descriptions and schemas to decide
// what to request. Anthropic never executes any of it - runTool below does.
const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'add_todo',
    description:
      'Add a new task to the todo list. Returns the id of the new task.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The task description.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'list_todos',
    description:
      'Return the current todo list as JSON. Each item has id, text, and done.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mark_done',
    description: [
      'Mark the todo with the given id as done. ',
      'Returns an error if the id does not exist.',
    ].join(''),
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The id of the todo to mark as done.',
        },
      },
      required: ['id'],
    },
  },
];

// runTool is the harness-side dispatcher. Anthropic knows nothing about it;
// the contract with `tools` above is just the `name` field.
function runTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'add_todo': {
      const id = nextId++;
      todos.push({ id, text: String(input.text), done: false });
      return JSON.stringify({ id });
    }
    case 'list_todos':
      return JSON.stringify(todos);
    case 'mark_done': {
      const id = Number(input.id);
      const todo = todos.find((t) => t.id === id);
      if (!todo) return JSON.stringify({ error: `no todo with id ${id}` });
      todo.done = true;
      return JSON.stringify({ ok: true });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const messages: Anthropic.Messages.MessageParam[] = [
  {
    role: 'user',
    content:
      "Add 'buy milk' and 'call mom' to my todo list, " +
      "then mark 'call mom' as done, " +
      "and tell me what's still pending.",
  },
];

// The agent loop: iterate until Claude's stop_reason says end_turn.
// Every iteration re-sends the full history of messages  because the API is
// stateless.
let turn = 0;
while (true) {
  turn++;
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    tools,
    messages,
  });

  console.log(`\n--- turn ${turn} (stop_reason=${response.stop_reason}) ---`);

  // Possible stop_reason values from the API:
  // - end_turn,
  // - tool_use,
  // - max_tokens,
  // - stop_sequence,
  // - refusal,
  // - pause_turn.
  //
  // Only the first two drive this loop; the rest fall through to the
  // "Unexpected" branch at the bottom.
  if (response.stop_reason === 'end_turn') {
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    console.log(`FINAL: ${text}`);
    break;
  }

  if (response.stop_reason === 'tool_use') {
    // Append the assistant's turn verbatim.
    // tool_use blocks must stay in the history so the tool_use_id references
    // in the next user turn resolve.
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = runTool(
          block.name,
          block.input as Record<string, unknown>,
        );
        console.log(
          `  tool: ${block.name}(${JSON.stringify(block.input)}) -> ${result}`,
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
    continue;
  }

  console.log(`Unexpected stop_reason: ${response.stop_reason}`);
  break;
}

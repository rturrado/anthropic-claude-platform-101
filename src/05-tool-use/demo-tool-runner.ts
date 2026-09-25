import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// Same client-side state as demo-manual.ts.
type Todo = { id: number; text: string; done: boolean };
const todos: Todo[] = [];
let nextId = 1;

// Tool implementations, one function per tool.
// Each takes the args Claude provides and returns the string that gets fed back
// into the conversation.
function addTodo({ text }: { text: string }): string {
  const id = nextId++;
  todos.push({ id, text, done: false });
  const result = JSON.stringify({ id });
  console.log(
    `  tool: add_todo({"text":${JSON.stringify(text)}}) -> ${result}`,
  );
  return result;
}

function listTodos(): string {
  const result = JSON.stringify(todos);
  console.log(`  tool: list_todos() -> ${result}`);
  return result;
}

function markDone({ id }: { id: number }): string {
  const todo = todos.find((t) => t.id === id);
  let result: string;
  if (!todo) {
    result = JSON.stringify({ error: `no todo with id ${id}` });
  } else {
    todo.done = true;
    result = JSON.stringify({ ok: true });
  }
  console.log(`  tool: mark_done({"id":${id}}) -> ${result}`);
  return result;
}

// betaTool bundles schema + run() into a single BetaRunnableTool.
// The SDK's toolRunner calls run() automatically whenever Claude asks for the
// tool - no dispatcher, no manual message-history bookkeeping.
const addTodoTool = betaTool({
  name: 'add_todo',
  description:
    'Add a new task to the todo list. Returns the id of the new task.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The task description.' },
    },
    required: ['text'],
  },
  run: addTodo,
});

const listTodosTool = betaTool({
  name: 'list_todos',
  description:
    'Return the current todo list as JSON. Each item has id, text, and done.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  run: listTodos,
});

const markDoneTool = betaTool({
  name: 'mark_done',
  description: [
    'Mark the todo with the given id as done. ',
    'Returns an error if the id does not exist.',
  ].join(''),
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The id of the todo to mark as done.',
      },
    },
    required: ['id'],
  },
  run: markDone,
});

// client.beta.messages.toolRunner runs the whole agent loop for us:
// - it reads stop_reason,
// - invokes the right run() on each tool_use,
// - re-injects results, and
// - iterates until end_turn.
//
// Compare with demo-manual.ts: the switch on stop_reason, the tool dispatcher,
// and the messages.push() bookkeeping all disappear.
const runner = client.beta.messages.toolRunner({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  tools: [addTodoTool, listTodosTool, markDoneTool],
  messages: [
    {
      role: 'user',
      content:
        "Add 'buy milk' and 'call mom' to my todo list, " +
        "then mark 'call mom' as done, " +
        "and tell me what's still pending.",
    },
  ],
});

// The runner is an async iterable.
// Each yielded value is one BetaMessage from Claude.
// Tool run() callbacks execute between yields, so their console.logs appear
// interleaved with the per-turn banners below.
let turn = 0;
for await (const message of runner) {
  turn++;
  console.log(`\n--- turn ${turn} (stop_reason=${message.stop_reason}) ---`);
  if (message.stop_reason === 'end_turn') {
    for (const block of message.content) {
      if (block.type === 'text') {
        console.log(`FINAL: ${block.text}`);
      }
    }
  }
}

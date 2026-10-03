import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

type Todo = { id: number; text: string; done: boolean };
const todos: Todo[] = [];
let nextId = 1;

/** Add a new todo. Returns the created item's id. */
function addTodo({ text }: { text: string }): { id: number } {
  const id = nextId++;
  todos.push({ id, text, done: false });
  console.log(
    `  tool: add_todo({"text":${JSON.stringify(text)}}) -> {"id":${id}}`,
  );
  return { id };
}

/** List every todo currently stored. */
function listTodos(): Todo[] {
  console.log(`  tool: list_todos() -> ${JSON.stringify(todos)}`);
  return todos;
}

/** Mark a todo as done by id. Throws if the id is unknown. */
function markDone({ id }: { id: number }): { id: number; done: true } {
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    throw new Error(`no todo with id ${id}`);
  }
  todo.done = true;
  console.log(`  tool: mark_done({"id":${id}}) -> {"id":${id},"done":true}`);
  return { id, done: true };
}

// The underlying functions return structured objects; betaZodTool's run()
// contract is `string | ToolResultContentBlockParam[]`, so each wrapper
// serializes with JSON.stringify before handing the result back to Claude.
const addTodoTool = betaZodTool({
  name: 'add_todo',
  description:
    'Add a new task to the todo list. Returns the id of the new task.',
  inputSchema: z.object({
    text: z.string().describe('The task description.'),
  }),
  run: (args) => JSON.stringify(addTodo(args)),
});

const listTodosTool = betaZodTool({
  name: 'list_todos',
  description:
    'Return the current todo list as JSON. Each item has id, text, and done.',
  inputSchema: z.object({}),
  run: () => JSON.stringify(listTodos()),
});

const markDoneTool = betaZodTool({
  name: 'mark_done',
  description: [
    'Mark the todo with the given id as done.',
    'Throws if the id does not exist.',
  ].join(' '),
  inputSchema: z.object({
    id: z.number().describe('The id of the todo to mark as done.'),
  }),
  run: (args) => JSON.stringify(markDone(args)),
});

async function run(userQuestion: string): Promise<string> {
  const runner = client.beta.messages.toolRunner({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    tools: [addTodoTool, listTodosTool, markDoneTool],
    messages: [{ role: 'user', content: userQuestion }],
  });

  let finalText = '';
  let turn = 0;
  for await (const message of runner) {
    turn++;
    console.log(`\n--- turn ${turn} (stop_reason=${message.stop_reason}) ---`);
    if (message.stop_reason === 'end_turn') {
      for (const block of message.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }
    }
  }
  return finalText;
}

const answer = await run(
  [
    "Add 'buy milk' and 'call mom' to my todo list,",
    "then mark 'call mom' as done,",
    "and tell me what's still pending.",
  ].join(' '),
);
console.log(`\nFINAL: ${answer}`);

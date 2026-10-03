// RUN: 1. Open a new Claude session.
//      2. Type /claude-api to load the Claude API skill.
//      3. Paste this prompt:
//         Fill in the TODOs and save the result as
//         `src/13-claude-api/demo-tool-runner.ts`.
//         Use `client.beta.messages.toolRunner` with each function wrapped by
//         `betaZodTool` from `@anthropic-ai/sdk/helpers/beta/zod`.
//         Run it with `tsx` and show the output.

import { makeClient } from '../lib/client.ts';

const client = makeClient();

type Todo = { id: number; text: string; done: boolean };
const todos: Todo[] = [];

/** Add a new todo. Returns the created item's id. */
function addTodo({ text }: { text: string }): { id: number } {
  // TODO: push a Todo with the next id and done=false, return { id }
  return { id: 0 };
}

/** List every todo currently stored. */
function listTodos(): Todo[] {
  // TODO: return the current todos array
  return [];
}

/** Mark a todo as done by id. Throws if the id is unknown. */
function markDone({ id }: { id: number }): { id: number; done: true } {
  // TODO: find the todo by id; throw Error if missing;
  // otherwise set done=true and return { id, done: true }
  return { id, done: true };
}

async function run(userQuestion: string): Promise<string> {
  // TODO: build a client.beta.messages.toolRunner that exposes
  // addTodo, listTodos and markDone (wrapped with betaZodTool);
  // model: claude-haiku-4-5; iterate the runner and return the final text.
  return '';
}

const answer = await run(
  [
    "Add 'buy milk' and 'call mom' to my todo list,",
    "then mark 'call mom' as done,",
    "and tell me what's still pending.",
  ].join(' '),
);
console.log(answer);

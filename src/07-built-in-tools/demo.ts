import Anthropic from '@anthropic-ai/sdk';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// Server tools run on Anthropic's infrastructure. There is no agent loop -
// declare the tool, send the request, and the response already includes
// the tool call (`server_tool_use` block), its result (a tool-specific
// result block), and Claude's final text, all in one turn.
// Contrast with lesson 5, where the client had to run the tools and iterate.

// Today's date, ISO. Injected into the system prompt of any call that hinges on
// "current" / "latest" / "as of today".
// The Anthropic API does not do this for you, so without it the model falls
// back to its training cutoff as an implicit "now" - and confidently dismisses
// correct web-search evidence about later dates as "future".
const today = new Date().toISOString().slice(0, 10);
const dateSystemPrompt = [
  `Today is ${today}.`,
  'Use this as the reference date for any "current", "latest", or',
  '"as of today" question.',
  'Trust web search results about dates after your training cutoff instead of',
  'dismissing them as "future".',
].join(' ');

async function runCall(
  label: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<void> {
  const start = Date.now();
  const response = await client.messages.create(params);
  const elapsedMs = Date.now() - start;

  console.log(`\n=== ${label} ===`);
  console.log(`Time:          ${elapsedMs} ms`);
  console.log(`Input tokens:  ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  // Server tools report their own request counters (`web_search_requests`),
  // useful for billing and for spotting loops.
  if (response.usage.server_tool_use) {
    console.log(
      `Server tool use: ${JSON.stringify(response.usage.server_tool_use)}`,
    );
  }

  console.log('\n--- Full response ---');
  console.dir(response, { depth: 4, maxStringLength: 200 });

  // Just the model's final text answer, for quick reading.
  console.log('\n--- Text ---');
  for (const block of response.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
}

// Call 1: web_search - grounded question about something the model does not
// know from training. Watch for citations woven into the final text.
await runCall('web_search', {
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: dateSystemPrompt,
  tools: [{ type: 'web_search_20260318', name: 'web_search' }],
  messages: [
    {
      role: 'user',
      content: [
        'What is the latest stable version of TypeScript as of today,',
        'and what was the most notable feature or change in that release?',
        'Cite your sources.',
      ].join(' '),
    },
  ],
});

// Call 2: code_execution - the same under-constrained puzzle from lesson 6.
// In lesson 6 sonnet-high got tangled enumerating solutions in its head and
// hit the token ceiling.
// Here we hand it a Python sandbox: brute-force all 3^3 * 3^3 assignments,
// filter by the clues, count the valid ones.
// Deterministic, exhaustive, and free of the "logic puzzles are unique" bias.
const puzzle = [
  'Using code_execution, enumerate ALL valid assignments that satisfy the',
  'constraints below.',
  'Print the exact count and list every solution as a table.',
  '',
  'Three friends - Ana, Bea, Carla',
  '- each own a different pet (dog, cat, bird),',
  'live in a different city (Madrid, Barcelona, Sevilla),',
  'and have a different job (doctor, teacher, engineer).',
  'Clues:',
  '(1) Ana does not live in Madrid.',
  '(2) The engineer lives in Barcelona.',
  '(3) Carla owns the cat.',
  '(4) The person in Sevilla owns the dog.',
  '(5) Bea is not the doctor.',
].join('\n');

await runCall('code_execution', {
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  tools: [{ type: 'code_execution_20260521', name: 'code_execution' }],
  messages: [{ role: 'user', content: puzzle }],
});

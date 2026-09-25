import { makeClient } from '../lib/client.ts';

const client = makeClient();

// Under-constrained logic puzzle: with the five clues below there are four
// consistent assignments, not one. Watching how each condition handles the
// ambiguity is the actual test - does it pick one silently, enumerate all,
// or flag the under-constraint?
const puzzle = [
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
  'Who owns which pet, lives where, and does what job?',
].join(' ');

// Same model (Sonnet 4.6), three configurations of extended thinking.
// Extended thinking is only supported on Sonnet 4+ and Opus 4+ - Haiku 4.5
// does not offer it.
// Thinking tokens are billed as output tokens, so a larger budget_tokens is
// real money.
// max_tokens must comfortably exceed budget_tokens;
// a common recipe is budget plus a couple of thousand for the final answer.
const conditions = [
  { label: 'no thinking', thinking: undefined, maxTokens: 2048 },
  {
    label: 'thinking 1K',
    thinking: { type: 'enabled' as const, budget_tokens: 1024 },
    maxTokens: 3072,
  },
  {
    label: 'thinking 4K',
    thinking: { type: 'enabled' as const, budget_tokens: 4096 },
    maxTokens: 6144,
  },
];

for (const cfg of conditions) {
  const start = Date.now();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: cfg.maxTokens,
    thinking: cfg.thinking,
    messages: [{ role: 'user', content: puzzle }],
  });
  const elapsedMs = Date.now() - start;

  const thinking = response.content
    .filter((block) => block.type === 'thinking')
    .map((block) => block.thinking)
    .join('\n\n');
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  console.log(`\n=== ${cfg.label} ===`);
  console.log(`Time:          ${elapsedMs} ms`);
  console.log(`Input tokens:  ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  console.log('--- Thinking ---');
  console.log(thinking || '(none)');
  console.log('--- Final ---');
  console.log(text);
}

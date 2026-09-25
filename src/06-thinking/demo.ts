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

// Three configurations, two knobs:
// - `thinking: { type: 'adaptive' }` lets Claude decide dynamically when to
//   think and how much - no explicit token budget to pick.
// - `output_config.effort` (low | medium | high | xhigh | max) dials the
//   depth. It goes inside output_config, not next to thinking.
// Adaptive thinking is Opus 4.7's default mode. Sonnet 4.6 also accepts the
// same shape; effort maps to different internal budgets per model.
const conditions = [
  {
    label: 'sonnet low',
    model: 'claude-sonnet-4-6' as const,
    maxTokens: 1024,
    thinking: { type: 'adaptive' as const, display: 'summarized' as const },
    output_config: { effort: 'low' as const },
  },
  {
    label: 'sonnet high',
    model: 'claude-sonnet-4-6' as const,
    maxTokens: 4096,
    thinking: { type: 'adaptive' as const, display: 'summarized' as const },
    output_config: { effort: 'high' as const },
  },
  {
    label: 'opus adaptive',
    model: 'claude-opus-4-7' as const,
    maxTokens: 8192,
    thinking: { type: 'adaptive' as const, display: 'summarized' as const },
    output_config: undefined,
  },
];

for (const cfg of conditions) {
  const start = Date.now();
  const response = await client.messages.create({
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    thinking: cfg.thinking,
    ...(cfg.output_config ? { output_config: cfg.output_config } : {}),
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

  console.log(`\n=== ${cfg.label} (${cfg.model}) ===`);
  console.log(`Time:          ${elapsedMs} ms`);
  console.log(`Input tokens:  ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  console.log('--- Thinking ---');
  console.log(thinking || '(none)');
  console.log('--- Final ---');
  console.log(text);
}

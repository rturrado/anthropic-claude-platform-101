import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// The system prompt is an array of blocks so a `cache_control` marker can be
// attached to the block holding the Go spec.
// Anthropic caches the marked prefix; subsequent calls that reuse the same
// prefix are billed at 10% of input tokens for it instead of 100%.
const SPEC_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'go-spec-statements.md',
);
const spec = readFileSync(SPEC_PATH, 'utf-8');

async function ask(label: string, question: string): Promise<void> {
  const start = Date.now();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: [
      {
        type: 'text',
        text: [
          'You are a Go language expert.',
          'Answer using ONLY the specification excerpt below,',
          'and quote the exact clause you rely on.',
        ].join(' '),
      },
      {
        type: 'text',
        text: spec,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: question }],
  });
  const elapsedMs = Date.now() - start;

  console.log(`\n=== ${label} ===`);
  console.log(`Time:                        ${elapsedMs} ms`);
  console.log(`Input tokens (uncached):     ${response.usage.input_tokens}`);
  console.log(
    `Cache creation input tokens: ${
      response.usage.cache_creation_input_tokens ?? 0
    }`,
  );
  console.log(
    `Cache read input tokens:     ${
      response.usage.cache_read_input_tokens ?? 0
    }`,
  );
  console.log(`Output tokens:               ${response.usage.output_tokens}`);

  console.log('\n--- Text ---');
  for (const block of response.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
}

await ask(
  'first-call-writes-cache',
  [
    "Describe Go's short variable declaration and where it is allowed.",
    'Answer in 3-4 sentences.',
  ].join(' '),
);

await ask(
  'second-call-reads-cache',
  [
    'Explain how Go handles a `fallthrough` statement inside a switch.',
    'Answer in 3-4 sentences.',
  ].join(' '),
);

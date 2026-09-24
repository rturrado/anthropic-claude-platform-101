import { makeClient } from '../lib/client.ts';

const client = makeClient();

const models = [
  'claude-haiku-4-5',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
] as const;

const prompt = [
  'A train leaves city A heading toward city B at 60 km/h.',
  'At the same time, a bird leaves B heading toward A at 90 km/h.',
  'When the bird meets the train, it turns around and flies back to B.',
  'Upon reaching B, it turns around again and flies toward the train,',
  'and so on, until the train arrives at B.',
  'If A and B are 120 km apart, how many kilometers will the bird have flown in total?',
  'Reason step by step before giving your final answer.',
].join(' ');

for (const model of models) {
  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - start;

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  console.log(`\n=== ${model} ===`);
  console.log(`Time:          ${elapsedMs} ms`);
  console.log(`Input tokens:  ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  console.log('--- Response ---');
  console.log(text);
}

import { makeClient } from '../lib/client.ts';

const client = makeClient();

// A minimal call: model, max_tokens, and messages.
// messages is a list of {role, content} pairs, even for a single turn.
const response = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 256,
  messages: [
    {
      role: 'user',
      content: 'What is the capital of Catalonia? Answer in a single sentence.',
    },
  ],
});

const text = response.content
  .filter((block) => block.type === 'text')
  .map((block) => block.text)
  .join('\n');

console.log('--- Response ---');
console.log(text);
console.log('--- Usage ---');
console.log(`Input:  ${response.usage.input_tokens} tokens`);
console.log(`Output: ${response.usage.output_tokens} tokens`);

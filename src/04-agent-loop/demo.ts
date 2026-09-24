import { makeClient } from '../lib/client.ts';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const client = makeClient();

const systemPrompt = [
  'You are a Socratic tutor.',
  'When the user brings you a question, a problem, a decision,',
  'or a concept they want to understand, do not answer directly.',
  'Instead, guide them with pointed questions and small hints that',
  'help them reason through it themselves.',
  'Confirm the conclusion only once they have worked it out.',
  'If they insist on the answer, redirect them to the next step.',
  'Keep each reply short: one or two sentences,',
  'ending in a question when possible.',
].join(' ');

type Message = { role: 'user' | 'assistant'; content: string };
const messages: Message[] = [];

let totalInputTokens = 0;
let totalOutputTokens = 0;

const rl = createInterface({ input: stdin, output: stdout });

console.log('Socratic tutor ready. Type "exit" (or empty line) to quit.\n');

while (true) {
  const input = (await rl.question('you > ')).trim();
  if (
    input === '' ||
    input.toLowerCase() === 'exit' ||
    input.toLowerCase() === 'quit'
  ) {
    break;
  }

  messages.push({ role: 'user', content: input });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: systemPrompt,
    messages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  messages.push({ role: 'assistant', content: text });
  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;

  console.log(`bot > ${text}\n`);
}

rl.close();

console.log('---');
console.log(`Turns:             ${messages.length / 2}`);
console.log(`Cumulative input:  ${totalInputTokens} tokens`);
console.log(`Cumulative output: ${totalOutputTokens} tokens`);

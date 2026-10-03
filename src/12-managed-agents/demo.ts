import { makeClient } from '../lib/client.ts';

const client = makeClient();

// Agent, Environment, Session, Events - the four primitives of managed agents.
// The agent and environment are reusable long-lived resources; the session is
// one run.
// Idempotent setup (list / create-if-missing) keeps the workspace tidy across
// repeated executions of this demo.
const AGENT_NAME = 'Stock Price Reporter';
const ENVIRONMENT_NAME = 'stock-price-env';
const SYMBOL = 'INTC';

async function ensureAgent(): Promise<string> {
  for await (const a of client.beta.agents.list()) {
    if (a.name === AGENT_NAME) {
      console.log(`Reusing agent: ${a.id} (${a.name})`);
      return a.id;
    }
  }
  console.log(`Creating agent "${AGENT_NAME}"...`);
  const agent = await client.beta.agents.create({
    name: AGENT_NAME,
    model: 'claude-haiku-4-5',
    system: [
      'You fetch the current stock price for a given ticker',
      'and reply with a single short line in the shape:',
      '"<TICKER> $<price> (<+/-change%>)".',
    ].join(' '),
    tools: [
      {
        type: 'agent_toolset_20260401',
        default_config: { enabled: true },
      },
    ],
  });
  console.log(`Agent created: ${agent.id}`);
  return agent.id;
}

async function ensureEnvironment(): Promise<string> {
  for await (const e of client.beta.environments.list()) {
    if (e.name === ENVIRONMENT_NAME) {
      console.log(`Reusing environment: ${e.id} (${e.name})`);
      return e.id;
    }
  }
  console.log(`Creating environment "${ENVIRONMENT_NAME}"...`);
  const env = await client.beta.environments.create({
    name: ENVIRONMENT_NAME,
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  });
  console.log(`Environment created: ${env.id}`);
  return env.id;
}

const agentId = await ensureAgent();
const environmentId = await ensureEnvironment();

const session = await client.beta.sessions.create({
  agent: agentId,
  environment_id: environmentId,
  title: `Fetch ${SYMBOL} spot price`,
});
console.log(`Session created: ${session.id}\n`);

// Open the stream BEFORE sending the kickoff.
// The stream only delivers events that occur after it opens, so a kickoff sent
// earlier would be missed.
const stream = await client.beta.sessions.events.stream(session.id);

await client.beta.sessions.events.send(session.id, {
  events: [
    {
      type: 'user.message',
      content: [
        {
          type: 'text',
          text: [
            `What is the current stock price of ${SYMBOL} (Intel)`,
            "and the day's percentage change?",
            'Use the available tools to look it up,',
            'then reply with a single short line in the exact format:',
            `"${SYMBOL} $<price> (<+/-X.XX>%)".`,
          ].join(' '),
        },
      ],
    },
  ],
});

console.log('--- Event stream ---');
let lastUsage: { input_tokens?: number; output_tokens?: number } | undefined;
for await (const event of stream) {
  if (event.type === 'agent.message') {
    for (const block of event.content ?? []) {
      if (block.type === 'text') {
        process.stdout.write(block.text);
      }
    }
    process.stdout.write('\n');
  } else if (event.type === 'agent.tool_use') {
    console.log(`[tool_use] ${event.name}`);
  } else if (event.type === 'agent.tool_result') {
    console.log(`[tool_result]`);
  } else if (event.type === 'session.usage') {
    lastUsage = event.usage;
  } else if (event.type === 'session.status_idle') {
    console.log('\n--- Session idle (agent done) ---');
    break;
  } else if (event.type === 'session.error') {
    console.error(`\n[session.error]`, event);
    break;
  }
}

if (lastUsage) {
  console.log(`\nInput tokens:  ${lastUsage.input_tokens ?? 0}`);
  console.log(`Output tokens: ${lastUsage.output_tokens ?? 0}`);
}

import Anthropic from '@anthropic-ai/sdk';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// GitHub's remote MCP server. The service provider maintains it - we point at
// the URL, pass a bearer token, and let Claude discover the available tools.
// Set GITHUB_MCP_TOKEN in .env.local from `gh auth token`.
const GITHUB_MCP_URL = 'https://api.githubcopilot.com/mcp/';
const token = process.env.GITHUB_MCP_TOKEN;
if (!token) {
  throw new Error(
    [
      'GITHUB_MCP_TOKEN is not set. See .env.local.example and run',
      '`echo "GITHUB_MCP_TOKEN=$(gh auth token)" >> .env.local`.',
    ].join(' '),
  );
}

// The MCP client is a beta feature; this header is required on every request.
const MCP_BETA = 'mcp-client-2026-09-15';

async function runCall(
  label: string,
  params: Anthropic.Beta.MessageCreateParamsNonStreaming,
): Promise<void> {
  const start = Date.now();
  const response = await client.beta.messages.create(params);
  const elapsedMs = Date.now() - start;

  console.log(`\n=== ${label} ===`);
  console.log(`Time:          ${elapsedMs} ms`);
  console.log(`Input tokens:  ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}`);
  if (response.usage.server_tool_use) {
    console.log(
      `Server tool use: ${JSON.stringify(response.usage.server_tool_use)}`,
    );
  }

  console.log('\n--- Text ---');
  for (const block of response.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
}

// Call 1: discover the tools exposed by the MCP server.
// All tools are enabled by default; Claude introspects the server and reports
// what it sees.
await runCall('mcp-introspection', {
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  betas: [MCP_BETA],
  mcp_servers: [
    {
      type: 'url',
      url: GITHUB_MCP_URL,
      name: 'github',
      authorization_token: token,
    },
  ],
  tools: [{ type: 'mcp_toolset', mcp_server_name: 'github' }],
  messages: [
    {
      role: 'user',
      content: [
        'Briefly, what categories of tools does this MCP server expose?',
        'List 3-5 example tool names per category.',
        'No exhaustive listing.',
      ].join(' '),
    },
  ],
});

// Call 2: fork listing, scoped to a single MCP tool.
// Only `github_search_repositories` is enabled; the rest of the toolset
// (issues, PRs, file edits, workflow runs, ...) stays off to prevent
// accidental writes and keep the context lean.
await runCall('mcp-list-forks', {
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  betas: [MCP_BETA],
  mcp_servers: [
    {
      type: 'url',
      url: GITHUB_MCP_URL,
      name: 'github',
      authorization_token: token,
    },
  ],
  tools: [
    {
      type: 'mcp_toolset',
      mcp_server_name: 'github',
      default_config: { enabled: false },
      configs: {
        search_repositories: { enabled: true },
      },
    },
  ],
  messages: [
    {
      role: 'user',
      content: [
        'List all forks in the GitHub account rturrado.',
        'Present the result as a markdown table with columns',
        '`Fork` and `Description`,',
        'sorted alphabetically by fork name (case-insensitive).',
      ].join(' '),
    },
  ],
});

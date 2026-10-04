# Claude Platform 101 - parallel exercises

Side project I run in parallel to the free [Claude Platform 101](https://anthropic.skilljar.com/claude-platform-101) course from Anthropic Academy.  
One folder per lesson under `src/`, all sharing the same client and the same dependencies.

## Setup

1.  `npm install`
2.  `cp .env.local.example .env.local`
3.  Edit `.env.local` and set your real `ANTHROPIC_API_KEY` and `GITHUB_MCP_TOKEN`. See [Getting the keys](#getting-the-keys) for details.

### Getting the keys

#### `ANTHROPIC_API_KEY`

1.  Log in to the [Anthropic Console](https://console.anthropic.com).
2.  Go to *Settings / API Keys* and click *Create Key*.
3.  Give it a name and copy the key; it is shown only once.

New accounts get a small free credit. Once it runs out, requests fail with `429` until you top up or enable billing on the workspace.

#### `GITHUB_MCP_TOKEN`

A GitHub token with read access to your repositories. Generate a Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens). Minimum scopes:

- *Fine-grained* (recommended):
  - *Resource owner* = your user.
  - *Repository access* = *Public repositories* (or *All repositories* if you also want private forks).
  - *Repository permissions / Metadata: Read-only*.
- *Classic*:
  - `public_repo` for public repos only, or
  - `repo` if you also want private forks.

The MCP endpoint used in lesson 9 (`api.githubcopilot.com/mcp/`) may require an active GitHub Copilot subscription even with a valid token.

## Running a lesson

```
npm run run:lesson -- src/02-first-call/demo.ts
```

Change the path to the lesson you want to run.

> [!NOTE]
> Lesson 9 requires a mandatory extra argument: the GitHub account whose forks will be listed.  
> Example: `npm run run:lesson -- src/09-mcp/demo.ts rturrado`.

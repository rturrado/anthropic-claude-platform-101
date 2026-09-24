# Claude Platform 101 - parallel exercises

Side project I run in parallel to the free [Claude Platform 101](https://anthropic.skilljar.com/claude-platform-101) course from Anthropic Academy.
One folder per lesson under `src/`, all sharing the same client and the same dependencies.

## Setup

1.  `npm install`
2.  `cp .env.local.example .env.local`
3.  Edit `.env.local` and set your real `ANTHROPIC_API_KEY`.

## Running a lesson

```
npm run run:lesson -- src/02-first-call/demo.ts
```

Change the path to the lesson you want to run.

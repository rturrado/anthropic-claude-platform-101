import { toFile } from '@anthropic-ai/sdk';
import { createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient } from '../lib/client.ts';

const client = makeClient();

// A Skill is a folder with a SKILL.md (plus optional scripts / resources).
// Upload it once, then attach it to any messages.create call via
// container.skills.
// Skills live on Anthropic's servers - persistent across runs and across
// projects on your account.
const SKILL_DISPLAY_NAME = 'Recipe Formatter';
const SKILL_MD_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'recipe-formatter-skill',
  'SKILL.md',
);

// Idempotent upload: list, find by display_name, only upload if absent.
async function ensureRecipeSkill(): Promise<string> {
  for await (const s of client.skills.list()) {
    if (s.display_name === SKILL_DISPLAY_NAME) {
      console.log(`Reusing existing skill: ${s.id} (${s.display_name})`);
      return s.id;
    }
  }
  console.log(`Uploading new skill "${SKILL_DISPLAY_NAME}"...`);
  const skill = await client.skills.create({
    display_name: SKILL_DISPLAY_NAME,
    // The API rejects absolute paths in filenames, and `createReadStream`
    // carries the full disk path as the file's name.
    // `toFile` lets us override that with the plain basename.
    files: [await toFile(createReadStream(SKILL_MD_PATH), 'SKILL.md')],
  });
  console.log(`Uploaded skill: ${skill.id}`);
  return skill.id;
}

const skillId = await ensureRecipeSkill();

// Deliberately unstructured user prompt - one flowing paragraph with the
// ingredients and the method mixed together. The Skill's job is to shape it
// into the recipe card format defined in SKILL.md.
const aglioOlioPrompt = [
  'I want to make spaghetti aglio e olio, the classic Roman weeknight one.',
  'Ingredients: spaghetti, garlic, extra virgin olive oil, dried chili flakes',
  '(peperoncino), fresh parsley, salt, black pepper.',
  'Method: boil the pasta in generously salted water, meanwhile slice the',
  'garlic thinly and fry gently in olive oil with the peperoncino, do not let',
  'the garlic brown or it turns bitter. Drain the pasta reserving some cooking',
  'water, toss the pasta in the pan with the oil-garlic mixture, add a splash',
  'of the reserved water to emulsify into a light sauce, finish off the heat',
  'with chopped parsley and a grind of black pepper.',
].join(' ');

const start = Date.now();
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  // The container carries the Skill attachments:
  // - `type: 'custom'` marks it as a user-uploaded Skill (as opposed to a
  //   first-party one).
  // - `version: 'latest'` tracks whatever version is currently latest for that
  //   skill.
  container: {
    skills: [{ type: 'custom', skill_id: skillId, version: 'latest' }],
  },
  // Skills run inside the code_execution tool's container, so code_execution
  // must be enabled even if the Skill itself only formats text.
  tools: [{ type: 'code_execution_20260521', name: 'code_execution' }],
  messages: [{ role: 'user', content: aglioOlioPrompt }],
});
const elapsedMs = Date.now() - start;

console.log(`\n=== Recipe Formatter on a spaghetti aglio e olio dump ===`);
console.log(`Time:          ${elapsedMs} ms`);
console.log(`Input tokens:  ${response.usage.input_tokens}`);
console.log(`Output tokens: ${response.usage.output_tokens}`);
if (response.usage.server_tool_use) {
  console.log(
    `Server tool use: ${JSON.stringify(response.usage.server_tool_use)}`,
  );
}

console.log('\n--- Full response ---');
console.dir(response, { depth: 4, maxStringLength: 200 });

console.log('\n--- Text ---');
for (const block of response.content) {
  if (block.type === 'text') {
    console.log(block.text);
  }
}

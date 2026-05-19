// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverSkills,
  loadAgentsMd,
  buildSystemPrompt,
  findSkillRequest,
} from '../src/skills.js';

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.join(fixturesDir, 'fixtures', 'skills');
const agentsMdPath = path.join(fixturesDir, 'fixtures', 'AGENTS.md');

test('discoverSkills returns [] for missing dir', async () => {
  const skills = await discoverSkills('/this/path/does/not/exist');
  assert.deepEqual(skills, []);
});

test('discoverSkills returns [] when arg is empty', async () => {
  assert.deepEqual(await discoverSkills(''), []);
  assert.deepEqual(await discoverSkills(null), []);
});

test('discoverSkills loads SKILL.md files with frontmatter', async () => {
  const skills = await discoverSkills(skillsDir);
  assert.equal(skills.length, 2);
  const names = skills.map((s) => s.name);
  assert.deepEqual(names, ['issue-triage', 'pr-review']); // sorted
  const prReview = skills.find((s) => s.name === 'pr-review');
  assert.equal(prReview.description, 'Review a pull request diff.');
  assert.match(prReview.body, /Walk through the diff/);
});

test('loadAgentsMd reads file content trimmed', async () => {
  const content = await loadAgentsMd(agentsMdPath);
  assert.match(content, /careful, terse code reviewer/);
  assert.equal(content, content.trim());
});

test('loadAgentsMd returns "" for missing file', async () => {
  assert.equal(await loadAgentsMd('/missing.md'), '');
  assert.equal(await loadAgentsMd(''), '');
});

test('buildSystemPrompt includes AGENTS.md and skill index', () => {
  const prompt = buildSystemPrompt({
    agentsMd: 'You are an agent.',
    skills: [
      { name: 'pr-review', description: 'Review PRs.' },
      { name: 'triage', description: 'Triage issues.' },
    ],
  });
  assert.match(prompt, /You are an agent\./);
  assert.match(prompt, /## Available skills:/);
  assert.match(prompt, /### pr-review — Review PRs\./);
  assert.match(prompt, /### triage — Triage issues\./);
  assert.match(prompt, /<skill name="skill-name">/);
});

test('buildSystemPrompt with only agentsMd omits skills section', () => {
  const prompt = buildSystemPrompt({ agentsMd: 'AGENTS', skills: [] });
  assert.equal(prompt, 'AGENTS');
});

test('buildSystemPrompt with no inputs returns ""', () => {
  assert.equal(buildSystemPrompt({ agentsMd: '', skills: [] }), '');
});

test('findSkillRequest extracts skill name from tag', () => {
  assert.equal(findSkillRequest('<skill name="pr-review" />'), 'pr-review');
  assert.equal(findSkillRequest('text <skill name="issue-triage"></skill> more'), 'issue-triage');
  assert.equal(findSkillRequest("<SKILL name='changelog'/>"), 'changelog');
});

test('findSkillRequest returns null when no tag present', () => {
  assert.equal(findSkillRequest('no skill tag here'), null);
  assert.equal(findSkillRequest(''), null);
  assert.equal(findSkillRequest(null), null);
});

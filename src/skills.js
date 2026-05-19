// SPDX-License-Identifier: Apache-2.0
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import matter from 'gray-matter';

const SKILL_REQUEST_RE = /<skill\s+name=["']([^"']+)["']\s*\/?>/i;

export async function discoverSkills(skillsDir) {
  if (!skillsDir) return [];
  try {
    const s = await stat(skillsDir);
    if (!s.isDirectory()) return [];
  } catch {
    return [];
  }

  const files = await globby(['**/SKILL.md'], {
    cwd: skillsDir,
    caseSensitiveMatch: false,
    absolute: true,
  });

  const skills = await Promise.all(
    files.map(async (file) => {
      try {
        const raw = await readFile(file, 'utf8');
        const parsed = matter(raw);
        const data = parsed.data || {};
        const name =
          data.name || path.basename(path.dirname(file)) || path.basename(file, '.md');
        const description = data.description || '';
        return {
          name: String(name),
          description: String(description),
          body: parsed.content.trim(),
          path: file,
        };
      } catch {
        return null;
      }
    }),
  );

  return skills
    .filter((s) => s && s.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadAgentsMd(filePath) {
  if (!filePath) return '';
  try {
    const raw = await readFile(filePath, 'utf8');
    return raw.trim();
  } catch {
    return '';
  }
}

export function buildSystemPrompt({ agentsMd, skills }) {
  const parts = [];
  if (agentsMd && agentsMd.trim()) parts.push(agentsMd.trim());

  if (skills && skills.length > 0) {
    const lines = ['## Available skills:'];
    for (const skill of skills) {
      const desc = skill.description ? ` — ${skill.description}` : '';
      lines.push(`### ${skill.name}${desc}`);
    }
    lines.push('');
    lines.push(
      'To load a skill, emit a `<skill name="skill-name">` tag and the body will be appended on the next iteration.',
    );
    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n').trim();
}

export function findSkillRequest(text) {
  if (!text) return null;
  const match = text.match(SKILL_REQUEST_RE);
  return match ? match[1] : null;
}

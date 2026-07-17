'use strict';

const DELIMITER = '---';

/**
 * Splits a raw markdown file's contents into frontmatter metadata and body.
 * Frontmatter grammar is intentionally narrow: flat `key: value` lines
 * between two `---` delimiter lines. No nested YAML.
 */
function parseFrontmatter(raw, filename) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0].trim() !== DELIMITER) {
    throw new Error(`[frontmatter] ${filename}: file must start with a "---" frontmatter block`);
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === DELIMITER) {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new Error(`[frontmatter] ${filename}: missing closing "---" for frontmatter block`);
  }

  const metadataLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join('\n').replace(/^\n+/, '');

  const metadata = {};
  for (const line of metadataLines) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(`[frontmatter] ${filename}: invalid frontmatter line (expected "key: value"): "${line}"`);
    }
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    metadata[key] = parseValue(key, rawValue);
  }

  return { metadata, body };
}

function parseValue(key, rawValue) {
  if (key === 'tags') {
    return parseTags(rawValue);
  }
  return stripQuotes(rawValue);
}

function parseTags(rawValue) {
  if (!rawValue) return [];
  let value = rawValue.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1);
  }
  return value
    .split(',')
    .map((tag) => stripQuotes(tag.trim()))
    .filter(Boolean);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

module.exports = { parseFrontmatter };

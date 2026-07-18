'use strict';

const fs = require('fs');
const path = require('path');

const config = require('./config');
const { parseFrontmatter } = require('./frontmatter');
const { parseMarkdown, slugify, stripHtml } = require('./markdown-parser');
const templates = require('./templates');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const SRC_DIR = path.join(ROOT, 'src');
const DIST_DIR = path.join(ROOT, 'dist');

function readPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { metadata, body } = parseFrontmatter(raw, filename);

    if (!metadata.title) {
      throw new Error(`[build] ${filename}: frontmatter is missing required field "title"`);
    }
    if (!metadata.date || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
      throw new Error(`[build] ${filename}: frontmatter "date" is missing or not in YYYY-MM-DD format`);
    }

    const contentHtml = parseMarkdown(body);
    const plainText = stripHtml(contentHtml);

    const filenameSlugMatch = filename.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
    const fallbackSlug = filenameSlugMatch ? filenameSlugMatch[1] : slugify(filename.replace(/\.md$/, ''));
    const slug = metadata.slug || fallbackSlug || slugify(metadata.title);

    const description = metadata.description || plainText.slice(0, 160);
    const excerptText = plainText.slice(0, 160) + (plainText.length > 160 ? '...' : '');

    return {
      title: metadata.title,
      date: metadata.date,
      tags: metadata.tags || [],
      description,
      excerptText,
      slug,
      url: `/posts/${slug}/`,
      contentHtml,
      filename,
    };
  });
}

function validateUniqueSlugs(posts) {
  const seen = new Map();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(
        `[build] duplicate slug "${post.slug}" in ${post.filename} and ${seen.get(post.slug)}`
      );
    }
    seen.set(post.slug, post.filename);
  }
}

function buildTagMap(posts) {
  const tagMap = {};
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(post);
    }
  }
  return tagMap;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function copyStaticAssets() {
  const stylesSrc = path.join(SRC_DIR, 'styles');
  const scriptsSrc = path.join(SRC_DIR, 'scripts');
  if (fs.existsSync(stylesSrc)) {
    fs.cpSync(stylesSrc, path.join(DIST_DIR, 'styles'), { recursive: true });
  }
  if (fs.existsSync(scriptsSrc)) {
    fs.cpSync(scriptsSrc, path.join(DIST_DIR, 'scripts'), { recursive: true });
  }
}

function build() {
  const posts = readPosts();
  validateUniqueSlugs(posts);
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const post of posts) {
    const html = templates.postPage(post, config);
    writeFile(path.join(DIST_DIR, 'posts', post.slug, 'index.html'), html);
  }

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b));
  writeFile(path.join(DIST_DIR, 'index.html'), templates.indexPage(posts, allTags, config));

  const tagMap = buildTagMap(posts);
  for (const [tagName, tagPosts] of Object.entries(tagMap)) {
    const tagSlug = slugify(tagName);
    const html = templates.tagPage(tagName, tagPosts, config);
    writeFile(path.join(DIST_DIR, 'tags', tagSlug, 'index.html'), html);
  }
  writeFile(path.join(DIST_DIR, 'tags', 'index.html'), templates.tagIndexPage(tagMap, config));

  const searchIndex = posts.map((post) => ({
    title: post.title,
    url: post.url,
    date: post.date,
    tags: post.tags,
    excerpt: post.excerptText,
    content: stripHtml(post.contentHtml).toLowerCase(),
  }));
  writeFile(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchIndex));

  copyStaticAssets();

  console.log(`[build] ${posts.length} posts, ${allTags.length} tags -> ${DIST_DIR}`);
}

build();

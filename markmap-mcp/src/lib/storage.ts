/**
 * Storage utilities for persisting markmap outputs
 *
 * Provides per-agent isolated storage so every tool call
 * automatically persists its output (SVG, HTML, Markdown)
 * to a dedicated folder structure.
 *
 * Follows the same durability pattern as gait_mcp:
 * - fsync after every write
 * - mkdir with parents=True, exist_ok=True
 * - Per-agent directory isolation
 *
 * @module lib/storage
 */

import { promises as fs, openSync, writeSync, fsyncSync, closeSync } from 'fs';
import path from 'path';

/**
 * Root directory for all markmap output storage.
 * Configurable via MARKMAP_STORAGE_ROOT env var.
 */
export const MARKMAP_STORAGE_ROOT = process.env.MARKMAP_STORAGE_ROOT || '/opt/mcp-servers/markmap_output';

/**
 * Paths returned after saving tool outputs
 */
export interface SavedFiles {
  svg: string;
  html: string;
  md: string;
}

/**
 * Paths returned after saving structure outputs (no SVG)
 */
export interface SavedStructureFiles {
  md: string;
  json: string;
}

/**
 * Write a file to disk with fsync for durability (matching gait_mcp pattern).
 */
function writeFileSync(filePath: string, content: string): void {
  const fd = openSync(filePath, 'w');
  try {
    writeSync(fd, content, null, 'utf-8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * Sanitize an agent ID to prevent path traversal.
 * Only allows [a-zA-Z0-9._-] characters.
 * Matches gait_mcp pattern: safe_id = "".join(c for c in agent_id if c.isalnum() or c in "-_.")
 *
 * @param agentId - Raw agent ID string
 * @returns Sanitized agent ID safe for use as directory name
 * @throws Error if agentId is empty or sanitizes to empty
 */
export function sanitizeAgentId(agentId: string): string {
  if (!agentId || agentId.trim().length === 0) {
    throw new Error('agent_id cannot be empty');
  }

  const sanitized = agentId.replace(/[^a-zA-Z0-9._-]/g, '');

  if (sanitized.length === 0) {
    throw new Error('agent_id contains no valid characters (allowed: a-zA-Z0-9._-)');
  }

  return sanitized;
}

/**
 * Ensure the agent's storage directory exists, creating it if needed.
 *
 * @param agentId - Raw agent ID (will be sanitized)
 * @returns Absolute path to the agent's storage directory
 */
export async function ensureAgentDir(agentId: string): Promise<string> {
  const sanitized = sanitizeAgentId(agentId);
  const agentDir = path.join(MARKMAP_STORAGE_ROOT, sanitized);
  console.error(`[storage] Ensuring agent dir: ${agentDir}`);
  await fs.mkdir(agentDir, { recursive: true });
  return agentDir;
}

/**
 * Generate a standalone HTML page that renders a markmap client-side.
 *
 * Server-side SVG generation via JSDOM produces zero-coordinate paths because
 * JSDOM has no layout engine.  Instead we embed the source Markdown and load
 * markmap-lib + markmap-view from CDN so the browser performs the layout.
 *
 * @param markdownContent - Source Markdown to render as a mindmap
 * @param title - Page title
 * @returns Complete HTML document string
 */
export function generateHtml(markdownContent: string, title: string): string {
  // Escape backticks and backslashes so the markdown survives a JS template literal
  const escaped = markdownContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    header {
      padding: 12px 24px;
      background: #fff;
      width: 100%;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
    }
    header h1 { font-size: 1.1rem; color: #333; }
    #markmap {
      flex: 1;
      width: 100%;
      min-height: calc(100vh - 52px);
      background: #fff;
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <svg id="markmap"></svg>

  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.17.0/dist/browser/index.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.17.0/dist/browser/index.js"></script>
  <script>
    const md = \`${escaped}\`;
    const { Transformer } = markmap;
    const { Markmap } = markmap;
    const transformer = new Transformer();
    const { root } = transformer.transform(md);
    const svg = document.getElementById('markmap');
    Markmap.create(svg, { autoFit: true }, root);
  </script>
</body>
</html>`;
}

/**
 * Save SVG, HTML, and Markdown outputs to the agent's storage directory.
 * Uses fsync for durability (matching gait_mcp pattern).
 *
 * @param agentId - Agent identifier
 * @param toolName - Name of the tool that produced the output
 * @param svgContent - SVG markup
 * @param markdownContent - Source markdown
 * @returns Paths to the saved files
 */
export async function saveOutputs(
  agentId: string,
  toolName: string,
  svgContent: string,
  markdownContent: string
): Promise<SavedFiles> {
  const agentDir = await ensureAgentDir(agentId);
  const timestamp = Date.now();
  const baseName = `${toolName}_${timestamp}`;

  const svgPath = path.join(agentDir, `${baseName}.svg`);
  const htmlPath = path.join(agentDir, `${baseName}.html`);
  const mdPath = path.join(agentDir, `${baseName}.md`);

  const title = `Markmap — ${toolName} (${new Date(timestamp).toISOString()})`;
  const htmlContent = generateHtml(markdownContent, title);

  console.error(`[storage] Writing files to ${agentDir}:`);
  console.error(`[storage]   ${baseName}.svg (${svgContent.length} bytes)`);
  console.error(`[storage]   ${baseName}.html (${htmlContent.length} bytes)`);
  console.error(`[storage]   ${baseName}.md (${markdownContent.length} bytes)`);

  // Write with fsync for durability (matching gait_mcp pattern)
  writeFileSync(svgPath, svgContent);
  writeFileSync(htmlPath, htmlContent);
  writeFileSync(mdPath, markdownContent);

  console.error(`[storage] All files written successfully`);

  return { svg: svgPath, html: htmlPath, md: mdPath };
}

/**
 * Save markdown and JSON structure outputs to the agent's storage directory.
 * Used by getStructure which has no SVG output.
 * Uses fsync for durability (matching gait_mcp pattern).
 *
 * @param agentId - Agent identifier
 * @param toolName - Name of the tool that produced the output
 * @param markdownContent - Source markdown
 * @param structureData - Structure data to save as JSON
 * @returns Paths to the saved files
 */
export async function saveStructureOutputs(
  agentId: string,
  toolName: string,
  markdownContent: string,
  structureData: unknown
): Promise<SavedStructureFiles> {
  const agentDir = await ensureAgentDir(agentId);
  const timestamp = Date.now();
  const baseName = `${toolName}_${timestamp}`;

  const mdPath = path.join(agentDir, `${baseName}.md`);
  const jsonPath = path.join(agentDir, `${baseName}.json`);

  console.error(`[storage] Writing structure files to ${agentDir}:`);
  console.error(`[storage]   ${baseName}.md (${markdownContent.length} bytes)`);

  // Write with fsync for durability (matching gait_mcp pattern)
  writeFileSync(mdPath, markdownContent);
  writeFileSync(jsonPath, JSON.stringify(structureData, null, 2));

  console.error(`[storage] All files written successfully`);

  return { md: mdPath, json: jsonPath };
}

/**
 * Create the storage root directory if it does not exist.
 * Called once at server startup.
 */
export async function initStorageRoot(): Promise<void> {
  console.error(`[storage] Initializing storage root: ${MARKMAP_STORAGE_ROOT}`);
  await fs.mkdir(MARKMAP_STORAGE_ROOT, { recursive: true });
}

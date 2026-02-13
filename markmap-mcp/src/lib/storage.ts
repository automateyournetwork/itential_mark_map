/**
 * Storage utilities for persisting markmap outputs
 *
 * Provides per-agent isolated storage so every tool call
 * automatically persists its output (SVG, HTML, Markdown)
 * to a dedicated folder structure.
 *
 * @module lib/storage
 */

import { promises as fs } from 'fs';
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
 * Sanitize an agent ID to prevent path traversal.
 * Only allows [a-zA-Z0-9._-] characters.
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
  await fs.mkdir(agentDir, { recursive: true });
  return agentDir;
}

/**
 * Generate a standalone HTML page wrapping an SVG mindmap.
 *
 * @param svgContent - The SVG markup to embed
 * @param title - Page title
 * @returns Complete HTML document string
 */
export function generateHtml(svgContent: string, title: string): string {
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
      align-items: center;
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
    .container {
      flex: 1;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      overflow: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <div class="container">
    ${svgContent}
  </div>
</body>
</html>`;
}

/**
 * Save SVG, HTML, and Markdown outputs to the agent's storage directory.
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
  const htmlContent = generateHtml(svgContent, title);

  await Promise.all([
    fs.writeFile(svgPath, svgContent, 'utf-8'),
    fs.writeFile(htmlPath, htmlContent, 'utf-8'),
    fs.writeFile(mdPath, markdownContent, 'utf-8'),
  ]);

  return { svg: svgPath, html: htmlPath, md: mdPath };
}

/**
 * Save markdown and JSON structure outputs to the agent's storage directory.
 * Used by getStructure which has no SVG output.
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

  await Promise.all([
    fs.writeFile(mdPath, markdownContent, 'utf-8'),
    fs.writeFile(jsonPath, JSON.stringify(structureData, null, 2), 'utf-8'),
  ]);

  return { md: mdPath, json: jsonPath };
}

/**
 * Create the storage root directory if it does not exist.
 * Called once at server startup.
 */
export async function initStorageRoot(): Promise<void> {
  await fs.mkdir(MARKMAP_STORAGE_ROOT, { recursive: true });
}

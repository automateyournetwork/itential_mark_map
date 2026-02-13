/**
 * markmap_from_outline tool implementation
 *
 * Generate mindmap from hierarchical outline structure
 *
 * @module tools/fromOutline
 */

import { MarkmapHandler } from '../lib/markmap-handler.js';
import { outlineToMarkdown, countNodes, calculateDepth } from '../utils/markdown-parser.js';
import { sanitizeAgentId, saveOutputs } from '../lib/storage.js';
import type { FromOutlineInput, FromOutlineOutput, ToolResponse, ToolError } from '../lib/types.js';

/**
 * Generate mindmap from outline items
 *
 * @param input - Tool input parameters
 * @returns MCP tool response with SVG content and generated markdown
 */
export async function fromOutlineTool(
  input: FromOutlineInput
): Promise<ToolResponse<FromOutlineOutput> | ToolError> {
  try {
    // Validate agent_id
    try {
      sanitizeAgentId(input.agent_id);
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Invalid agent_id'}`
        }],
        isError: true,
        errorType: 'ValidationError'
      };
    }

    // Validate input
    if (!input.outline_items || input.outline_items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Outline items cannot be empty'
        }],
        isError: true,
        errorType: 'ValidationError'
      };
    }

    // Validate each item
    for (let i = 0; i < input.outline_items.length; i++) {
      const item = input.outline_items[i];
      if (!item.text || item.text.trim().length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Error: Outline item ${i + 1} has empty text`
          }],
          isError: true,
          errorType: 'ValidationError'
        };
      }
      if (!item.level || item.level < 1 || item.level > 6) {
        return {
          content: [{
            type: 'text',
            text: `Error: Outline item ${i + 1} has invalid level (must be 1-6)`
          }],
          isError: true,
          errorType: 'ValidationError'
        };
      }
    }

    // Convert outline to markdown
    const markdown_generated = outlineToMarkdown(input.outline_items);

    // Create handler and generate SVG
    const handler = new MarkmapHandler();
    const { root, features } = handler.parseMarkdown(markdown_generated);

    // Get statistics
    const nodeCount = countNodes(root);
    const depth = calculateDepth(root);

    // Render to SVG
    const svg_content = await handler.renderToSVG(markdown_generated, input.options);

    // Extract features
    const features_used = Object.keys(features || {});

    // Auto-save outputs
    const saved_files = await saveOutputs(input.agent_id, 'fromOutline', svg_content, markdown_generated);

    // Build response
    const output: FromOutlineOutput = {
      svg_content,
      markdown_generated,
      node_count: nodeCount,
      depth,
      features_used,
      saved_files
    };

    return {
      content: [{
        type: 'text',
        text: `Successfully generated mindmap from ${input.outline_items.length} outline items (${nodeCount} nodes total). Files saved to ${saved_files.svg}`
      }],
      structuredContent: output
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }],
      isError: true,
      errorType: 'RenderError'
    };
  }
}

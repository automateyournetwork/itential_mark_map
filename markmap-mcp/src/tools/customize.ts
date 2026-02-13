/**
 * markmap_customize tool implementation
 *
 * Generate mindmap with custom themes and styling
 *
 * @module tools/customize
 */

import { MarkmapHandler } from '../lib/markmap-handler.js';
import { countNodes } from '../utils/markdown-parser.js';
import { sanitizeAgentId, saveOutputs } from '../lib/storage.js';
import type { CustomizeInput, CustomizeOutput, ToolResponse, ToolError, MarkmapTheme } from '../lib/types.js';

/**
 * Generate customized mindmap
 *
 * @param input - Tool input parameters
 * @returns MCP tool response with customized SVG
 */
export async function customizeTool(
  input: CustomizeInput
): Promise<ToolResponse<CustomizeOutput> | ToolError> {
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
    if (!input.markdown_content || input.markdown_content.trim().length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Markdown content cannot be empty'
        }],
        isError: true,
        errorType: 'ValidationError'
      };
    }

    // Validate theme if provided
    const validThemes: MarkmapTheme[] = ['default', 'dark', 'colorful', 'minimal'];
    if (input.theme && !validThemes.includes(input.theme)) {
      return {
        content: [{
          type: 'text',
          text: `Error: Invalid theme '${input.theme}'. Valid themes: ${validThemes.join(', ')}`
        }],
        isError: true,
        errorType: 'ValidationError'
      };
    }

    // Validate color scheme if provided
    if (input.color_scheme) {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      for (let i = 0; i < input.color_scheme.length; i++) {
        if (!hexColorRegex.test(input.color_scheme[i])) {
          return {
            content: [{
              type: 'text',
              text: `Error: Invalid hex color at index ${i}: '${input.color_scheme[i]}'. Use format #RRGGBB`
            }],
            isError: true,
            errorType: 'ValidationError'
          };
        }
      }
    }

    // Create handler
    const handler = new MarkmapHandler();

    // Get theme or default
    const theme = input.theme || 'default';

    // Apply customization
    const svg_content = await handler.applyCustomization(
      input.markdown_content,
      theme,
      input.color_scheme,
      input.options
    );

    // Parse to get node count
    const { root } = handler.parseMarkdown(input.markdown_content);
    const node_count = countNodes(root);

    // Get colors used (from theme or custom)
    const colors_used = input.color_scheme || handler.getColorScheme(theme);

    // Determine which custom options were applied
    const custom_options: string[] = [];
    if (input.options) {
      Object.keys(input.options).forEach(key => {
        custom_options.push(key);
      });
    }

    // Auto-save outputs
    const saved_files = await saveOutputs(input.agent_id, 'customize', svg_content, input.markdown_content);

    // Build response
    const output: CustomizeOutput = {
      svg_content,
      theme_applied: theme,
      colors_used,
      node_count,
      customization_summary: {
        theme,
        custom_colors: !!input.color_scheme,
        custom_options
      },
      saved_files
    };

    const customizations: string[] = [];
    if (theme !== 'default') customizations.push(`theme: ${theme}`);
    if (input.color_scheme) customizations.push(`custom colors (${input.color_scheme.length})`);
    if (custom_options.length > 0) customizations.push(`custom options (${custom_options.length})`);

    const message = customizations.length > 0
      ? `Successfully generated customized mindmap with ${node_count} nodes. Applied: ${customizations.join(', ')}. Files saved to ${saved_files.svg}`
      : `Successfully generated mindmap with ${node_count} nodes using default theme. Files saved to ${saved_files.svg}`;

    return {
      content: [{
        type: 'text',
        text: message
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

# Markmap MCP Server

> **Model Context Protocol server for [markmap.js.org](https://markmap.js.org/) integration**

Generate interactive mindmaps from Markdown via Claude Code using the Model Context Protocol. Every tool call automatically persists SVG, HTML, and Markdown outputs to per-agent isolated storage for seamless integration with Itential's FlowAI platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)

---

## Features

- **5 Core Tools** for comprehensive mindmap generation
- **Per-Agent Storage** — every tool call auto-saves SVG, HTML, and Markdown to isolated agent directories
- **Seamless Integration** with Claude Code via MCP and Itential FlowAI
- **Dynamic Generation** from natural language prompts
- **SVG Output** for high-quality visualizations
- **Standalone HTML** files that open directly in any browser
- **4 Predefined Themes** (default, dark, colorful, minimal)
- **Type-Safe** TypeScript implementation
- **Security-Conscious** with path validation, agent ID sanitization, and limits

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/automateyournetwork/markmap-mcp.git
cd markmap-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Claude Code Configuration

#### Option 1: Local Development (recommended for testing)

Add to your Claude Code MCP settings (`.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "markmap": {
      "command": "node",
      "args": [
        "/absolute/path/to/markmap-mcp/dist/index.js"
      ],
      "env": {
        "MARKMAP_STORAGE_ROOT": "/opt/mcp-servers/markmap_output"
      }
    }
  }
}
```

Replace `/absolute/path/to/markmap-mcp/dist/index.js` with the actual path to your built file.

#### Option 2: Global Installation

```bash
npm install -g markmap-mcp
```

```json
{
  "mcpServers": {
    "markmap": {
      "command": "markmap-mcp",
      "env": {
        "MARKMAP_STORAGE_ROOT": "/opt/mcp-servers/markmap_output"
      }
    }
  }
}
```

**After updating your configuration, restart Claude Code to pick up the changes.**

---

## Per-Agent Storage

Every tool call requires an `agent_id` and automatically persists all outputs to an isolated directory.

### Storage Layout

```
/opt/mcp-servers/markmap_output/          <-- MARKMAP_STORAGE_ROOT
  agent-001/
    generate_1739450400000.svg
    generate_1739450400000.html
    generate_1739450400000.md
    customize_1739450401000.svg
    customize_1739450401000.html
    customize_1739450401000.md
    ...
  agent-002/
    ...
```

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MARKMAP_STORAGE_ROOT` | `/opt/mcp-servers/markmap_output` | Root directory for all agent output storage |

### File Formats

Each tool call that produces a visualization saves three files:

| Extension | Contents |
|-----------|----------|
| `.svg` | Raw SVG mindmap markup |
| `.html` | Standalone HTML page — open directly in a browser to view the mindmap |
| `.md` | Source Markdown used to generate the mindmap |

For `markmap_get_structure` (no SVG output), two files are saved:

| Extension | Contents |
|-----------|----------|
| `.md` | Source Markdown |
| `.json` | Hierarchical structure and statistics |

### Agent ID Rules

- Must be a non-empty string
- Only `a-z`, `A-Z`, `0-9`, `.`, `_`, `-` characters are allowed
- Invalid characters are stripped; if nothing remains, the call is rejected
- Path traversal attempts like `../etc` are blocked

---

## Available Tools

All tools require `agent_id` as the first parameter.

### 1. `markmap_generate`

Convert Markdown text to interactive mindmap SVG.

**Input:**
```json
{
  "agent_id": "agent-001",
  "markdown_content": "# AI\n## Machine Learning\n## NLP",
  "options": {
    "colorFreezeLevel": 6,
    "duration": 500,
    "maxWidth": 0,
    "zoom": true,
    "pan": true
  }
}
```

**Output includes:** `svg_content`, `node_count`, `depth`, `features_used`, `saved_files`

---

### 2. `markmap_from_outline`

Generate mindmap from hierarchical outline structure.

**Input:**
```json
{
  "agent_id": "agent-001",
  "outline_items": [
    { "text": "AI Technologies", "level": 1 },
    { "text": "Machine Learning", "level": 2 },
    { "text": "Deep Learning", "level": 3 },
    { "text": "Natural Language Processing", "level": 2 }
  ]
}
```

**Output includes:** `svg_content`, `markdown_generated`, `node_count`, `depth`, `saved_files`

---

### 3. `markmap_get_structure`

Extract and analyze hierarchical structure without rendering.

**Input:**
```json
{
  "agent_id": "agent-001",
  "markdown_content": "# Topic\n## Subtopic A\n## Subtopic B",
  "include_content": true
}
```

**Output includes:** `hierarchy`, `node_count`, `max_depth`, `statistics`, `saved_files` (`.md` + `.json`)

---

### 4. `markmap_render_file`

Read a Markdown file and generate mindmap.

**Input:**
```json
{
  "agent_id": "agent-001",
  "file_path": "./docs/architecture.md",
  "save_output": true,
  "output_path": "./output/architecture.svg"
}
```

**Output includes:** `svg_content`, `file_path`, `saved_path`, `node_count`, `file_size_kb`, `saved_files`

---

### 5. `markmap_customize`

Generate mindmap with custom themes and styling.

**Input:**
```json
{
  "agent_id": "agent-001",
  "markdown_content": "# Project\n## Frontend\n## Backend\n## Database",
  "theme": "dark",
  "color_scheme": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
  "options": { "maxWidth": 300 }
}
```

**Output includes:** `svg_content`, `theme_applied`, `colors_used`, `node_count`, `customization_summary`, `saved_files`

---

## Themes

| Theme | Description | ColorFreezeLevel |
|-------|-------------|-----------------|
| `default` | Standard colors, good general-purpose | 6 |
| `dark` | High contrast, great for presentations | 4 |
| `colorful` | Vibrant, engaging, great for creative work | 2 |
| `minimal` | Grayscale, professional and clean | 8 |

---

## Testing

### Step 1: Build the Project

```bash
cd markmap-mcp
npm install
npm run build
```

Verify zero TypeScript errors.

### Step 2: Create the Storage Directory

```bash
# Create the default storage root (or set MARKMAP_STORAGE_ROOT to a custom path)
sudo mkdir -p /opt/mcp-servers/markmap_output
sudo chown $(whoami) /opt/mcp-servers/markmap_output
```

Or for local testing without `sudo`:

```bash
export MARKMAP_STORAGE_ROOT=/tmp/markmap_output
mkdir -p $MARKMAP_STORAGE_ROOT
```

### Step 3: Configure Claude Code

Add the server to your MCP configuration (see [Claude Code Configuration](#claude-code-configuration) above), then restart Claude Code.

### Step 4: Test Each Tool

Open Claude Code and run these prompts to exercise each tool:

**Test `markmap_generate`:**
```
Create a mindmap about cloud computing with AWS, Azure, and GCP as subtopics
```

**Test `markmap_from_outline`:**
```
Create a mindmap from this outline:
- Software Development (level 1)
  - Frontend (level 2)
    - React (level 3)
    - Vue (level 3)
  - Backend (level 2)
    - Node.js (level 3)
    - Python (level 3)
```

**Test `markmap_customize`:**
```
Create a dark-themed mindmap about network automation with custom styling
```

**Test `markmap_render_file`:**
```
Render a mindmap from the file README.md
```

**Test `markmap_get_structure`:**
```
Analyze the structure of this markdown without rendering: # Root\n## A\n### A1\n## B\n### B1\n### B2
```

### Step 5: Verify Outputs

After each tool call, check the storage directory:

```bash
# List agent directories
ls -la /opt/mcp-servers/markmap_output/

# List files for a specific agent
ls -la /opt/mcp-servers/markmap_output/<agent_id>/

# You should see files like:
#   generate_1739450400000.svg
#   generate_1739450400000.html
#   generate_1739450400000.md
```

### Step 6: Verify HTML in Browser

Open any `.html` file directly in a browser:

```bash
open /opt/mcp-servers/markmap_output/<agent_id>/generate_1739450400000.html
```

The standalone HTML page should render the mindmap with proper styling.

### Step 7: Verify Agent Isolation

Run tool calls with different `agent_id` values and confirm each agent's files are in separate subdirectories under `MARKMAP_STORAGE_ROOT`.

### Step 8: Verify Security

Confirm that invalid `agent_id` values are rejected:
- Empty string -> error
- `../etc` -> sanitized to `..etc` (dots and hyphens allowed, slash stripped)
- `@#$%` -> error (no valid characters remain)

---

## Development

### Project Structure

```
markmap-mcp/
├── src/
│   ├── index.ts                # MCP server entry point + storage init
│   ├── tools/                  # Tool implementations
│   │   ├── generate.ts         # markmap_generate
│   │   ├── fromOutline.ts      # markmap_from_outline
│   │   ├── renderFile.ts       # markmap_render_file
│   │   ├── getStructure.ts     # markmap_get_structure
│   │   └── customize.ts        # markmap_customize
│   ├── lib/
│   │   ├── markmap-handler.ts  # Core markmap integration
│   │   ├── storage.ts          # Per-agent storage utilities
│   │   └── types.ts            # TypeScript definitions
│   └── utils/
│       └── markdown-parser.ts  # Utility functions
├── tests/                      # Test suite
├── examples/                   # Usage examples
└── dist/                       # Compiled JavaScript
```

### Scripts

```bash
npm run build         # Compile TypeScript
npm run dev           # Watch mode
npm run test          # Run tests
npm run test:coverage # Test with coverage
npm run lint          # Lint code
npm run clean         # Remove build artifacts
```

---

## Security

### Limits and Validation

| Check | Limit |
|-------|-------|
| File Size | 5 MB max for file operations |
| Content Size | 1 MB max for markdown content |
| Node Count | 10,000 nodes max per mindmap |
| Depth | 20 levels max |
| File Extensions | `.md` and `.markdown` only |
| Path Validation | Must be within cwd or agent storage directory |
| Agent ID | Sanitized to `[a-zA-Z0-9._-]` only |

---

## Troubleshooting

### Server doesn't start
```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Verify build exists
ls dist/index.js

# Run directly to see error output
node dist/index.js
```

### Storage directory errors
```bash
# Check permissions
ls -la /opt/mcp-servers/markmap_output

# Create with correct ownership
sudo mkdir -p /opt/mcp-servers/markmap_output
sudo chown $(whoami) /opt/mcp-servers/markmap_output

# Or use a custom path
export MARKMAP_STORAGE_ROOT=$HOME/markmap_output
```

### Tools not appearing in Claude
1. Check MCP configuration format
2. For local development, ensure you're using the full path with `node` command and `args`
3. Verify `dist/index.js` exists (run `npm run build`)
4. Restart Claude Code after configuration changes
5. Check Claude Code logs for MCP server connection errors

### SVG generation fails
```bash
# Check dependencies
npm list markmap-lib markmap-view jsdom

# Reinstall if needed
npm install
npm run build
```

---

## Links

- **Markmap**: https://markmap.js.org/
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **GitHub**: https://github.com/automateyournetwork/markmap-mcp

---

## Acknowledgments

- [Markmap](https://markmap.js.org/) by gera2ld for the visualization library
- [Anthropic](https://www.anthropic.com/) for the Model Context Protocol
- [Claude Code](https://claude.ai/code) for AI-powered development

---

**Current Version**: 1.0.0 | **Status**: Production Ready

**Built with**: TypeScript, Node.js, Markmap, MCP SDK, JSDOM

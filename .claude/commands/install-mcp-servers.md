---
name: "Install MCP Servers"
description: "Install and configure MCP servers for this NSTCG website project"
---

This command will set up project-appropriate MCP servers for the North Swanage Traffic Consultation Group website.

## MCP Servers to Install

Based on this project's needs, we'll install:

1. **Task Master MCP** - Project management and development workflow
2. **Filesystem MCP** - File operations within the project
3. **Git MCP** - Version control operations
4. **Web Search MCP** - Research capabilities for content updates

## Installation Commands

### 1. Create Project MCP Configuration

```bash
# Create .mcp.json for project-scoped servers
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "task-master": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "",
        "PERPLEXITY_API_KEY": "",
        "OPENAI_API_KEY": ""
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "./",
        "./css",
        "./js", 
        "./api",
        "./images",
        "./data",
        "./scripts",
        "./.cursor/rules"
      ]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "."]
    }
  }
}
EOF
```

### 2. Install Global Dependencies (one-time setup)

```bash
# Ensure Node.js and npm are available
node --version || echo "Please install Node.js from https://nodejs.org"

# Install commonly used MCP servers globally for performance
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-git  
npm install -g task-master-ai
```

### 3. Configure Environment Variables

```bash
# Add to .env.local (create if doesn't exist)
cat >> .env.local << 'EOF'

# MCP Configuration - Add your API keys here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
EOF

echo "🔧 Please update .env.local with your actual API keys"
echo "📝 Note: Only add keys for services you plan to use"
```

### 4. Test MCP Server Installation

```bash
# Test that servers can start
echo "Testing MCP servers..."

# Test filesystem server
npx @modelcontextprotocol/server-filesystem ./ --help && echo "✅ Filesystem MCP server available" || echo "❌ Filesystem MCP server failed"

# Test git server  
npx @modelcontextprotocol/server-git --help && echo "✅ Git MCP server available" || echo "❌ Git MCP server failed"

# Test task-master
npx task-master-ai --help && echo "✅ Task Master MCP available" || echo "❌ Task Master MCP failed"

echo "🎉 MCP server installation test complete"
```

## Usage After Installation

### For Claude Desktop Users:
1. **Restart Claude Desktop** after creating `.mcp.json`
2. **Approve project servers** when prompted
3. **Use natural language** to interact with files and tasks
4. **Example commands:**
   - "List files in the current directory"
   - "Show me the git status"
   - "What's the next task I should work on?"

### For Cursor/Windsurf Users:
1. **Copy .mcp.json to global config:**
   ```bash
   # For Cursor
   cp .mcp.json ~/.cursor/mcp.json
   
   # For Windsurf  
   cp .mcp.json ~/.codeium/windsurf/mcp_config.json
   ```
2. **Restart your editor**
3. **Enable MCP servers** in settings if required

## Available MCP Tools After Installation

### Task Master
- `get_tasks` - List project tasks
- `next_task` - Get next task to work on  
- `add_task` - Create new tasks
- `set_task_status` - Update task status
- `expand_task` - Break down complex tasks
- `initialize_project` - Set up task management
- `parse_prd` - Generate tasks from requirements

### Filesystem
- `read_file` - Read file contents
- `write_file` - Write to files
- `edit_file` - Make selective edits with dry-run preview
- `create_directory` - Create directories
- `list_directory` - List directory contents
- `move_file` - Move/rename files
- `search_files` - Search for files/directories
- `get_file_info` - Get file metadata

### Git
- `git_status` - Check git status
- `git_diff` - See file differences  
- `git_log` - View commit history
- `git_add` - Stage files
- `git_commit` - Commit changes
- `git_branch` - Branch operations

## Security Notes

- **Project scope**: Servers only access specified directories
- **Environment variables**: Keep API keys in `.env.local` (git-ignored)
- **File access**: Limited to specified directories in filesystem config
- **Review permissions**: Always review what MCP servers can access

## Troubleshooting

### Common Issues:

1. **"Server not found"**: Install dependencies with `npm install -g`
2. **"Permission denied"**: Check file permissions and Node.js installation
3. **"Server won't start"**: Verify paths in `.mcp.json` are correct
4. **"No tools available"**: Restart your editor after configuration
5. **Task Master needs API keys**: Add at least one API key to .env.local

### Debug Commands:

```bash
# Check Node.js and npm
node --version && npm --version

# Test MCP server manually
npx @modelcontextprotocol/server-filesystem ./

# Validate JSON configuration
cat .mcp.json | jq '.' >/dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Check available global packages
npm list -g --depth=0 | grep -E "(filesystem|git|task-master)"
```

## Project-Specific Customizations

For this NSTCG website project, the MCP setup provides:

- **Development workflow**: Task management with Task Master AI
- **File operations**: Easy editing of HTML, CSS, JS, and API files
- **Version control**: Git integration for commits and branches  
- **Content research**: AI-powered research capabilities (with API keys)
- **Focused access**: Only project directories are accessible

## Getting Started

1. Run the installation commands above
2. Add your API keys to `.env.local` 
3. Test with: "Initialize taskmaster-ai in my project"
4. Create a PRD at `scripts/prd.txt` for task generation
5. Start using natural language to manage files and tasks!

This configuration balances functionality with security while keeping everything contained to this specific project.

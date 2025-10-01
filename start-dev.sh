#!/bin/bash
cd ~/wonder
source venv/bin/activate
echo "✅ Wonder Healthcare environment ready!"
echo "📁 Project: ~/wonder"
echo "🐍 Python venv: activated"
echo "🤖 MCP servers: configured at ~/.config/claude-code/mcp-config.json"
echo "📦 Packages: $(ls -d packages/*/ 2>/dev/null | wc -l) found"
echo ""
echo "Run 'claude-code' to start Claude Code with MCP servers"
echo "Run 'npm run dev' to start all services"
echo ""
echo "MCP servers will auto-connect when Claude Code starts"

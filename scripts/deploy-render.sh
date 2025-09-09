#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo "Deploy to Render.com"
echo "======================================"
echo ""

# Check for required files
if [ ! -f "Dockerfile" ]; then
    echo "Error: Dockerfile not found"
    exit 1
fi

if [ ! -f "render.yaml" ]; then
    echo "Error: render.yaml not found"
    exit 1
fi

echo "Prerequisites:"
echo "1. Create a GitHub repository and push this code"
echo "2. Sign up for Render.com (free account available)"
echo "3. Connect your GitHub account to Render"
echo ""

echo "Deployment Steps:"
echo "----------------"
echo "1. Update render.yaml with your GitHub repo URL"
echo "2. Commit and push all changes to GitHub:"
echo "   git add -A"
echo "   git commit -m 'Prepare for Render deployment'"
echo "   git push origin main"
echo ""
echo "3. Go to https://dashboard.render.com/select-repo?type=web"
echo "4. Select your repository"
echo "5. Render will auto-detect render.yaml"
echo "6. Click 'Create Web Service'"
echo ""
echo "7. Set environment variables in Render dashboard:"
echo "   - AZURE_OPENAI_KEY=<your-key>"
echo "   - AZURE_OPENAI_URI=<your-uri>"
echo "   - ALLOWED_ORIGINS=<optional-additional-origins>"
echo ""
echo "8. Your app will be deployed to:"
echo "   https://wonder-gateway.onrender.com"
echo ""
echo "Note: Free tier may have cold starts (slow first request)"
echo "======================================"
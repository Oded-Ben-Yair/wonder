# Deployment Guide

This guide explains how to make the CEO Playground accessible from any computer.

## Option 1: Quick Testing with ngrok (5 minutes)

### Setup
```bash
# 1. Install ngrok (if not already installed)
npm install -g ngrok

# 2. Start the gateway server
cd gateway
npm start

# 3. In another terminal, start ngrok tunnel
./scripts/ngrok-start.sh
```

### Share the Link
1. ngrok will display a public URL like: `https://abc123.ngrok-free.app`
2. Share this URL with your CEO
3. The CEO can access: `https://abc123.ngrok-free.app/ceo-playground.html`

### Pros & Cons
✅ **Pros:**
- Instant setup
- No deployment needed
- Free for testing
- Works from any network

❌ **Cons:**
- URL changes each time
- Requires your computer to stay on
- May have ngrok branding/limits

## Option 2: Deploy to Render.com (30 minutes)

### Prerequisites
1. GitHub account
2. Render.com account (free tier available)

### Step-by-Step Deployment

#### 1. Prepare Code for GitHub
```bash
# Create .env.production (DO NOT commit this)
cat > .env.production << EOF
AZURE_OPENAI_KEY=your-actual-key
AZURE_OPENAI_URI=your-azure-uri
EOF

# Update render.yaml with your GitHub username
sed -i 's/YOUR_USERNAME/your-github-username/g' render.yaml

# Initialize git and push to GitHub
git add -A
git commit -m "Prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/wonder.git
git push -u origin main
```

#### 2. Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click "Create Web Service"

#### 3. Configure Environment Variables
In Render Dashboard → Environment:
- `AZURE_OPENAI_KEY`: Your Azure OpenAI key
- `AZURE_OPENAI_URI`: Your Azure endpoint
- `ALLOWED_ORIGINS`: (optional) Additional allowed domains

#### 4. Access Your Deployed App
- URL: `https://wonder-gateway.onrender.com`
- CEO Playground: `https://wonder-gateway.onrender.com/ceo-playground.html`

### Custom Domain (Optional)
1. In Render Dashboard → Settings → Custom Domains
2. Add your domain (e.g., `playground.yourcompany.com`)
3. Update DNS records as instructed

## Option 3: Deploy to Railway.app (15 minutes)

### Quick Deploy
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Open dashboard to set environment variables
railway open
```

### Environment Variables
Set in Railway dashboard:
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_URI`
- `PORT=5050`

## Option 4: Deploy to Google Cloud Run

### Setup
```bash
# Install gcloud CLI
# Configure project
gcloud config set project YOUR_PROJECT_ID

# Build and push container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/wonder-gateway

# Deploy to Cloud Run
gcloud run deploy wonder-gateway \
  --image gcr.io/YOUR_PROJECT_ID/wonder-gateway \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="AZURE_OPENAI_KEY=azure-key:latest"
```

## Security Considerations

### For Production Deployment

1. **API Keys**: Never commit secrets to Git
   - Use environment variables
   - Use secret management services

2. **Authentication**: Add basic auth to CEO playground
   ```javascript
   // Add to gateway/src/server.js
   app.use('/ceo-playground.html', basicAuth({
     users: { 'ceo': process.env.CEO_PASSWORD }
   }));
   ```

3. **Rate Limiting**: Prevent abuse
   ```bash
   npm install express-rate-limit
   ```

4. **HTTPS Only**: Ensure all traffic is encrypted
   - Render/Railway provide automatic SSL
   - For custom domains, use Cloudflare

5. **Monitoring**: Track usage and errors
   - Use Render's built-in metrics
   - Add error tracking (Sentry)

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port | Yes | `5050` |
| `NODE_ENV` | Environment | Yes | `production` |
| `AZURE_OPENAI_KEY` | Azure API key | Yes | `sk-...` |
| `AZURE_OPENAI_URI` | Azure endpoint | Yes | `https://...` |
| `ALLOWED_ORIGINS` | Extra CORS origins | No | `https://app.company.com` |
| `LOG_LEVEL` | Logging verbosity | No | `info` |

## Troubleshooting

### ngrok Issues
- **"Tunnel not found"**: Restart ngrok
- **"Invalid Host header"**: Update CORS settings
- **Slow connection**: Consider upgrading ngrok plan

### Render Deployment Issues
- **Build fails**: Check Dockerfile and logs
- **App crashes**: Check environment variables
- **Cold starts**: Normal on free tier, upgrade for always-on

### Azure OpenAI Errors
- **401 Unauthorized**: Check API key
- **429 Rate Limited**: Implement retries/backoff
- **Network timeout**: Increase timeout settings

## Quick Commands

```bash
# Start local development
npm run dev

# Test with ngrok
./scripts/ngrok-start.sh

# Check deployment readiness
docker build -t wonder-gateway .
docker run -p 5050:5050 wonder-gateway

# View logs (Render)
render logs wonder-gateway --tail

# Update deployment
git push origin main  # Auto-deploys on Render
```

## Support

For issues or questions:
1. Check logs in deployment platform
2. Verify environment variables
3. Test locally first
4. Check CORS and network settings

## Next Steps

1. **Immediate**: Use ngrok for quick CEO testing
2. **Production**: Deploy to Render for permanent URL
3. **Enhancement**: Add authentication and monitoring
4. **Scale**: Upgrade hosting plan as needed
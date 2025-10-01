#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Performance Optimization Implementation Guide
 *
 * This script provides specific implementation examples for the performance
 * optimizations identified in the comprehensive performance analysis.
 */

import fs from 'fs/promises';

const OPTIMIZATION_GUIDE = {
  compression: {
    title: "Content Compression Implementation",
    priority: "High",
    estimatedImpact: "20-30% faster page loads",
    implementations: {
      nginx: `
# Add to nginx.conf or site configuration
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
gzip_disable "MSIE [1-6]\\.";

# Brotli compression (if module available)
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
      `,
      azure: `
// Azure Static Web Apps - staticwebapp.config.json
{
  "globalHeaders": {
    "content-encoding": "gzip"
  },
  "mimeTypes": {
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  }
}
      `,
      express: `
// Express.js server compression
const compression = require('compression');
const express = require('express');
const app = express();

// Enable compression for all routes
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
  chunkSize: 1024,
  memLevel: 8
}));
      `
    }
  },

  caching: {
    title: "Intelligent Caching Strategy",
    priority: "High",
    estimatedImpact: "50%+ faster repeat page loads",
    implementations: {
      clientSide: `
<!-- HTML Meta Tags for Caching -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
<meta http-equiv="Expires" content="Thu, 01 Dec 2025 16:00:00 GMT">

<!-- Resource Hints -->
<link rel="preload" href="/static/app.js" as="script">
<link rel="preload" href="/static/app.css" as="style">
<link rel="prefetch" href="/api/health">
      `,
      serverSide: `
// Express.js caching headers
app.use('/static', express.static('public', {
  maxAge: '1y', // 1 year for static assets
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for HTML
    } else if (path.match(/\\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year for assets
    }
  }
}));

// API response caching
const cache = new Map();
app.get('/api/match', (req, res) => {
  const cacheKey = JSON.stringify(req.query);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }

  // Process request and cache result
  // ... your existing logic ...
});
      `,
      redis: `
// Redis caching implementation
const redis = require('redis');
const client = redis.createClient();

async function getCachedMatch(query) {
  const cacheKey = \`match:\${JSON.stringify(query)}\`;
  const cached = await client.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await performMatch(query);

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(result));

  return result;
}
      `
    }
  },

  preloading: {
    title: "Resource Preloading Strategy",
    priority: "Medium",
    estimatedImpact: "10-15% LCP improvement",
    implementations: {
      criticalResources: `
<!-- Critical Resource Preloading -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">
<link rel="preload" href="/js/app.bundle.js" as="script">

<!-- DNS Prefetch for external resources -->
<link rel="dns-prefetch" href="//wonder-backend-api.azurewebsites.net">
<link rel="dns-prefetch" href="//fonts.googleapis.com">

<!-- Preconnect for critical third-party origins -->
<link rel="preconnect" href="//wonder-backend-api.azurewebsites.net" crossorigin>
      `,
      dynamicPreloading: `
// Dynamic resource preloading based on user behavior
function preloadNextLikelyPage(userAction) {
  const preloadMap = {
    'search-started': '/api/match',
    'results-viewed': '/api/nurse-details',
    'filter-opened': '/api/cities'
  };

  const nextResource = preloadMap[userAction];
  if (nextResource) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = nextResource;
    document.head.appendChild(link);
  }
}

// Intersection Observer for lazy preloading
const preloadObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const preloadUrl = entry.target.dataset.preload;
      if (preloadUrl) {
        fetch(preloadUrl, { method: 'GET' });
      }
    }
  });
});
      `
    }
  },

  queryOptimization: {
    title: "Database Query Optimization",
    priority: "Medium",
    estimatedImpact: "20-30% response time reduction",
    implementations: {
      indexing: `
-- Database Indexes for Common Query Patterns
CREATE INDEX CONCURRENTLY idx_nurses_city ON nurses(city);
CREATE INDEX CONCURRENTLY idx_nurses_services ON nurses USING GIN(services);
CREATE INDEX CONCURRENTLY idx_nurses_city_services ON nurses(city, services);
CREATE INDEX CONCURRENTLY idx_nurses_rating ON nurses(rating DESC);
CREATE INDEX CONCURRENTLY idx_nurses_location ON nurses USING GIST(location);

-- Composite index for complex queries
CREATE INDEX CONCURRENTLY idx_nurses_complex ON nurses(city, gender, rating DESC)
  WHERE specializations IS NOT NULL;
      `,
      queryOptimization: `
// Optimized query with proper indexing
async function optimizedNurseSearch(filters) {
  const baseQuery = \`
    SELECT n.*,
           ST_Distance(n.location, ST_MakePoint($lat, $lng)) as distance
    FROM nurses n
    WHERE 1=1
  \`;

  const conditions = [];
  const params = {};

  // Use indexed columns first for better performance
  if (filters.city) {
    conditions.push('n.city = $city');
    params.city = filters.city;
  }

  if (filters.services?.length > 0) {
    conditions.push('n.services && $services');
    params.services = filters.services;
  }

  if (filters.gender) {
    conditions.push('n.gender = $gender');
    params.gender = filters.gender;
  }

  // Add distance filter if coordinates provided
  if (filters.lat && filters.lng && filters.radius) {
    conditions.push('ST_DWithin(n.location, ST_MakePoint($lat, $lng), $radius)');
    params.lat = filters.lat;
    params.lng = filters.lng;
    params.radius = filters.radius * 1000; // Convert km to meters
  }

  const finalQuery = baseQuery +
    (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '') +
    \` ORDER BY \${filters.urgent ? 'n.rating DESC, ' : ''}distance ASC
     LIMIT $limit\`;

  params.limit = filters.topK || 10;

  return await db.query(finalQuery, params);
}
      `
    }
  },

  serviceWorker: {
    title: "Service Worker Implementation",
    priority: "Low",
    estimatedImpact: "Enhanced user experience, offline capability",
    implementations: {
      registration: `
// Service Worker Registration (in main app)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered successfully');

      // Update available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.log('ServiceWorker registration failed: ', error);
    }
  });
}
      `,
      serviceWorker: `
// Service Worker (sw.js)
const CACHE_NAME = 'wonder-healthcare-v1';
const STATIC_RESOURCES = [
  '/',
  '/static/app.js',
  '/static/app.css',
  '/manifest.json'
];

const API_CACHE_NAME = 'wonder-api-v1';
const CACHEABLE_APIS = ['/api/health', '/api/cities'];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Static resources - cache first
  if (STATIC_RESOURCES.some(resource => url.pathname === resource)) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
    return;
  }

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache GET requests to specific endpoints
          if (request.method === 'GET' && CACHEABLE_APIS.some(api => url.pathname === api)) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request)) // Fallback to cache when offline
    );
    return;
  }

  // Default: network first
  event.respondWith(fetch(request));
});
      `
    }
  }
};

const MONITORING_CONFIG = {
  title: "Performance Monitoring Setup",
  description: "Comprehensive monitoring and alerting configuration",
  implementations: {
    applicationInsights: `
// Azure Application Insights setup
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY);
appInsights.start();

const client = appInsights.defaultClient;

// Custom performance tracking
function trackPerformance(operation, duration, success, properties = {}) {
  client.trackDependency({
    target: operation,
    name: operation,
    data: JSON.stringify(properties),
    duration,
    resultCode: success ? 200 : 500,
    success
  });
}

// API endpoint monitoring
app.use('/api/*', (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;

    trackPerformance(\`API \${req.method} \${req.path}\`, duration, success, {
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      city: req.body?.city
    });

    // Alert on slow responses
    if (duration > 1000) {
      client.trackException({
        exception: new Error(\`Slow API response: \${duration}ms\`),
        properties: { endpoint: req.path, duration }
      });
    }
  });

  next();
});
    `,
    clientSideMonitoring: `
// Client-side performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.initializeObservers();
  }

  initializeObservers() {
    // Core Web Vitals monitoring
    import('web-vitals').then(({ getCLS, getFID, getLCP }) => {
      getCLS(this.sendMetric.bind(this));
      getFID(this.sendMetric.bind(this));
      getLCP(this.sendMetric.bind(this));
    });

    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.sendMetric({
              name: 'page-load-time',
              value: entry.loadEventEnd - entry.loadEventStart,
              entries: [{
                ttfb: entry.responseStart - entry.requestStart,
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart
              }]
            });
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
    }

    // Long task detection
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.sendMetric({
              name: 'long-task',
              value: entry.duration,
              entries: [{ startTime: entry.startTime }]
            });
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  }

  sendMetric(metric) {
    // Send to monitoring service
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...metric
      })
    }).catch(console.error);
  }

  // Track custom user interactions
  trackUserAction(action, duration) {
    this.sendMetric({
      name: 'user-action',
      value: duration,
      entries: [{ action }]
    });
  }
}

// Initialize monitoring
const performanceMonitor = new PerformanceMonitor();
    `
  }
};

// Generate implementation guide
async function generateOptimizationGuide() {
  console.log('🚀 Wonder Healthcare Platform - Performance Optimization Guide');
  console.log('='.repeat(70));

  console.log('\\nThis guide provides specific implementation examples for the');
  console.log('performance optimizations identified in the analysis.\\n');

  for (const [key, optimization] of Object.entries(OPTIMIZATION_GUIDE)) {
    console.log(\`📊 \${optimization.title}\`);
    console.log(\`Priority: \${optimization.priority}\`);
    console.log(\`Expected Impact: \${optimization.estimatedImpact}\\n\`);

    for (const [implKey, implCode] of Object.entries(optimization.implementations)) {
      console.log(\`  🔧 \${implKey.charAt(0).toUpperCase() + implKey.slice(1)} Implementation:\`);
      console.log('  ' + '-'.repeat(50));
      console.log(implCode);
      console.log('');
    }

    console.log('\\n' + '='.repeat(70) + '\\n');
  }

  console.log('📊 Performance Monitoring Setup');
  console.log('Priority: High');
  console.log('Expected Impact: Proactive issue detection and resolution\\n');

  for (const [key, code] of Object.entries(MONITORING_CONFIG.implementations)) {
    console.log(\`  🔧 \${key.charAt(0).toUpperCase() + key.slice(1)}:\`);
    console.log('  ' + '-'.repeat(50));
    console.log(code);
    console.log('');
  }
}

// Performance testing script
async function createPerformanceTestScript() {
  const testScript = \`#!/bin/bash

# Wonder Healthcare Platform - Performance Testing Script
# Run this script to validate performance after optimizations

echo "🚀 Starting Performance Validation..."

# Test compression
echo "\\n📦 Testing Compression..."
curl -H "Accept-Encoding: gzip,deflate,br" -s -D - https://wonder-ceo-web.azurewebsites.net | grep -i "content-encoding"

# Test caching headers
echo "\\n⚡ Testing Cache Headers..."
curl -s -D - https://wonder-ceo-web.azurewebsites.net | grep -i "cache-control"

# Test preload hints
echo "\\n🔗 Testing Resource Hints..."
curl -s https://wonder-ceo-web.azurewebsites.net | grep -i "preload\\|prefetch\\|dns-prefetch"

# Load test
echo "\\n🏋️ Running Load Test..."
for i in {1..10}; do
  echo "Request \$i/10:"
  curl -w "@curl-format.txt" -o /dev/null -s https://wonder-backend-api.azurewebsites.net/health
done

echo "\\n✅ Performance validation complete!"
\`;

  await fs.writeFile('/home/odedbe/wonder/validate-optimizations.sh', testScript);
  console.log('📄 Performance validation script created: validate-optimizations.sh');
}

// Configuration templates
async function createConfigurationTemplates() {
  // Azure Static Web App configuration
  const azureConfig = \`{
  "globalHeaders": {
    "Cache-Control": "public, max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  },
  "routes": [
    {
      "route": "/static/*",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "route": "/*.html",
      "headers": {
        "Cache-Control": "public, max-age=3600"
      }
    },
    {
      "route": "/api/*",
      "headers": {
        "Cache-Control": "no-cache, must-revalidate"
      }
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "mimeTypes": {
    ".json": "application/json; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  }
}\`;

  await fs.writeFile('/home/odedbe/wonder/optimized-staticwebapp.config.json', azureConfig);

  // Web.config for Azure App Service
  const webConfig = \`<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <httpCompression directory="%SystemDrive%\\inetpub\\temp\\IIS Temporary Compressed Files">
      <scheme name="gzip" dll="%Windir%\\system32\\inetsrv\\gzip.dll" />
      <dynamicTypes>
        <add mimeType="text/*" enabled="true" />
        <add mimeType="message/*" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="application/json" enabled="true" />
      </dynamicTypes>
      <staticTypes>
        <add mimeType="text/*" enabled="true" />
        <add mimeType="message/*" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="application/json" enabled="true" />
      </staticTypes>
    </httpCompression>

    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
      <remove fileExtension=".js" />
      <mimeMap fileExtension=".js" mimeType="application/javascript; charset=utf-8" />
    </staticContent>

    <httpHeaders>
      <add name="X-Content-Type-Options" value="nosniff" />
      <add name="X-Frame-Options" value="DENY" />
      <add name="X-XSS-Protection" value="1; mode=block" />
    </httpHeaders>

    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>\`;

  await fs.writeFile('/home/odedbe/wonder/optimized-web.config', webConfig);

  console.log('📄 Configuration templates created:');
  console.log('  - optimized-staticwebapp.config.json (Azure Static Web Apps)');
  console.log('  - optimized-web.config (Azure App Service)');
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('Generating Performance Optimization Guide...\\n');

  generateOptimizationGuide()
    .then(() => createPerformanceTestScript())
    .then(() => createConfigurationTemplates())
    .then(() => {
      console.log('\\n🎉 Performance Optimization Guide Complete!');
      console.log('\\nNext steps:');
      console.log('1. Review the implementation examples above');
      console.log('2. Apply optimizations in priority order');
      console.log('3. Use validate-optimizations.sh to test improvements');
      console.log('4. Deploy optimized configuration files');
    })
    .catch(console.error);
}

export { OPTIMIZATION_GUIDE, MONITORING_CONFIG };
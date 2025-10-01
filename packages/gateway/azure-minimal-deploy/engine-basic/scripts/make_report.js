#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read summary data
const summaryPath = path.join(__dirname, '..', 'docs', 'csv_results_meta.json');
if (!fs.existsSync(summaryPath)) {
  console.error('Error: Run csv-smoke.sh first to generate test results');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

// Read individual scenario results
const scenarios = [];
for (const scenario of summary.scenarios) {
  const resultPath = path.join(__dirname, '..', 'docs', `csv_case_${scenario.scenario}.json`);
  if (fs.existsSync(resultPath)) {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    scenarios.push({
      ...scenario,
      fullResult: result
    });
  }
}

// Count unique nurses (estimate from test results)
let uniqueNurseIds = new Set();
for (const scenario of scenarios) {
  if (scenario.fullResult && scenario.fullResult.results) {
    scenario.fullResult.results.forEach(r => uniqueNurseIds.add(r.id));
  }
}

// Scenarios with zero results
const zeroResultScenarios = scenarios.filter(s => s.count === 0).map(s => s.label);

// Generate HTML report
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic Filter - CSV Test Report (CEO-Ready)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 2rem;
            font-size: 2.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }
        
        .stat-box {
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #5e72e4;
        }
        
        .stat-label {
            color: #666;
            margin-top: 0.5rem;
        }
        
        .weights-info {
            background: #f8f9fa;
            border-left: 4px solid #5e72e4;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 4px;
        }
        
        .weights-info h3 {
            color: #333;
            margin-bottom: 0.5rem;
        }
        
        .weights-info p {
            color: #666;
            line-height: 1.6;
        }
        
        .scenarios-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        
        .scenario-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .scenario-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .scenario-id {
            font-size: 1.2rem;
            font-weight: bold;
            color: #5e72e4;
        }
        
        .scenario-latency {
            color: #666;
            font-size: 0.9rem;
        }
        
        .scenario-label {
            color: #333;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        
        .scenario-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .scenario-stat {
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 4px;
        }
        
        .scenario-stat-label {
            font-size: 0.8rem;
            color: #666;
        }
        
        .scenario-stat-value {
            font-weight: bold;
            color: #333;
        }
        
        .nurse-list {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e0e0e0;
        }
        
        .nurse-item {
            display: flex;
            justify-content: space-between;
            padding: 0.3rem 0;
            font-size: 0.9rem;
        }
        
        .nurse-id {
            color: #666;
            font-family: monospace;
            font-size: 0.8rem;
        }
        
        .nurse-rating {
            color: #f39c12;
        }
        
        .error-badge {
            background: #dc3545;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        
        .success-badge {
            background: #28a745;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        
        .warning-badge {
            background: #ffc107;
            color: #333;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        
        footer {
            text-align: center;
            color: white;
            margin-top: 3rem;
            padding: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 Basic Filter - CSV Test Report</h1>
        
        <div class="summary-card">
            <h2>Test Summary - Data Source: CSV</h2>
            <div class="summary-grid">
                <div class="stat-box">
                    <div class="stat-value">${scenarios.length}</div>
                    <div class="stat-label">Total Scenarios</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${scenarios.filter(s => s.count > 0).length}</div>
                    <div class="stat-label">With Results</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${uniqueNurseIds.size}+</div>
                    <div class="stat-label">Unique Nurses</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${Math.round(scenarios.reduce((sum, s) => sum + s.latency_ms, 0) / scenarios.length)}ms</div>
                    <div class="stat-label">Avg Latency</div>
                </div>
            </div>
            
            ${zeroResultScenarios.length > 0 ? `
            <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <h4 style="color: #856404; margin-bottom: 0.5rem;">Scenarios with 0 Results (${zeroResultScenarios.length}):</h4>
                <ul style="color: #666; margin: 0; padding-left: 1.5rem;">
                    ${zeroResultScenarios.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div class="weights-info">
                <h3>Ranking Weights</h3>
                <p>
                    The Basic Filter ranking algorithm uses a multi-factor scoring system:
                    <br>• <strong>Services Match:</strong> 30% - Exact match on requested service type
                    <br>• <strong>Location/Distance:</strong> 20% - Proximity to requested location (when coordinates provided)
                    <br>• <strong>Availability:</strong> 20% - Time window overlap ratio
                    <br>• <strong>Rating:</strong> 15% - Nurse rating (3.5-5.0 scale)
                    <br>• <strong>Review Count:</strong> 10% - Number of reviews as trust indicator
                    <br>• <strong>Urgent Boost:</strong> 5% - Priority boost for urgent requests
                </p>
            </div>
        </div>
        
        <div class="summary-card">
            <h2>Scenario Results</h2>
            <div class="scenarios-grid">
                ${scenarios.map(s => `
                <div class="scenario-card">
                    <div class="scenario-header">
                        <span class="scenario-id">Scenario ${s.scenario}</span>
                        <span class="scenario-latency">${s.latency_ms}ms</span>
                    </div>
                    <div class="scenario-label">${s.label}</div>
                    
                    <div class="scenario-stats">
                        <div class="scenario-stat">
                            <div class="scenario-stat-label">Results</div>
                            <div class="scenario-stat-value">${s.count}</div>
                        </div>
                        <div class="scenario-stat">
                            <div class="scenario-stat-label">Schema</div>
                            <div class="scenario-stat-value">
                                ${s.schema_valid === "true" 
                                    ? '<span class="success-badge">Valid</span>' 
                                    : '<span class="error-badge">Invalid</span>'}
                            </div>
                        </div>
                        <div class="scenario-stat">
                            <div class="scenario-stat-label">Mean Rating</div>
                            <div class="scenario-stat-value">${s.mean_score.toFixed(2)}</div>
                        </div>
                        <div class="scenario-stat">
                            <div class="scenario-stat-label">Top IDs</div>
                            <div class="scenario-stat-value" style="font-size: 0.7rem; word-break: break-all;">
                                ${s.first_3_ids || 'None'}
                            </div>
                        </div>
                    </div>
                    
                    ${s.fullResult && s.fullResult.results && s.fullResult.results.length > 0 ? `
                    <div class="nurse-list">
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">Top Matches:</div>
                        ${s.fullResult.results.slice(0, 3).map((nurse, idx) => `
                        <div class="nurse-item">
                            <span>${idx + 1}. ${nurse.name}</span>
                            <span class="nurse-rating">★ ${(nurse.meta?.rating || 0).toFixed(1)}</span>
                        </div>
                        `).join('')}
                    </div>
                    ` : '<div class="nurse-list"><em>No results found</em></div>'}
                </div>
                `).join('')}
            </div>
        </div>
        
        <footer>
            <p>Generated on ${new Date().toISOString()}</p>
            <p>Basic Filter CSV Test Suite v1.0</p>
        </footer>
    </div>
</body>
</html>`;

// Write HTML report
const reportPath = path.join(__dirname, '..', 'docs', 'report.html');
fs.writeFileSync(reportPath, html);

console.log(`\nHTML report generated: ${reportPath}`);
console.log(`View at: http://localhost:5001/docs/report.html`);
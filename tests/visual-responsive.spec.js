// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - Visual & Responsive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should capture visual states across different viewports', async ({ page }) => {
    console.log('📱 Testing visual states across viewports...');

    const viewports = [
      { name: 'Desktop-Large', width: 1920, height: 1080 },
      { name: 'Desktop-Standard', width: 1366, height: 768 },
      { name: 'Laptop', width: 1024, height: 768 },
      { name: 'Tablet-Landscape', width: 1024, height: 768 },
      { name: 'Tablet-Portrait', width: 768, height: 1024 },
      { name: 'Mobile-Large', width: 414, height: 896 },
      { name: 'Mobile-Standard', width: 375, height: 667 },
      { name: 'Mobile-Small', width: 320, height: 568 }
    ];

    for (let i = 0; i < viewports.length; i++) {
      const viewport = viewports[i];
      console.log(`Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow layout to adjust

      // Take full page screenshot
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', `50-visual-${viewport.name.toLowerCase()}.png`),
        fullPage: true
      });

      // Take viewport screenshot
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', `51-viewport-${viewport.name.toLowerCase()}.png`),
        fullPage: false
      });

      // Check for horizontal scrollbars on mobile
      if (viewport.width <= 768) {
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });

        if (hasHorizontalScroll) {
          console.log(`⚠ Horizontal scroll detected on ${viewport.name}`);
        } else {
          console.log(`✓ No horizontal scroll on ${viewport.name}`);
        }
      }

      // Test responsive elements visibility
      const elementsToCheck = [
        'input',
        'button',
        'form',
        'nav',
        '[role="navigation"]'
      ];

      const visibilityResults = {};

      for (const selector of elementsToCheck) {
        const elements = await page.locator(selector).all();
        const visibleElements = [];

        for (const element of elements) {
          if (await element.isVisible()) {
            visibleElements.push(element);
          }
        }

        visibilityResults[selector] = {
          total: elements.length,
          visible: visibleElements.length
        };
      }

      console.log(`${viewport.name} - Element visibility:`, visibilityResults);
    }

    console.log('✓ Visual viewport testing completed');
  });

  test('should test mobile touch interactions', async ({ page }) => {
    console.log('👆 Testing mobile touch interactions...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Take initial mobile screenshot
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '52-mobile-initial.png'),
      fullPage: true
    });

    // Test touch interactions
    const touchTargets = [
      'button',
      'input',
      '[role="button"]',
      'a'
    ];

    let touchableElements = [];

    for (const selector of touchTargets) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          touchableElements.push({ element, selector });
        }
      }
    }

    console.log(`Found ${touchableElements.length} touchable elements`);

    // Test tap interactions on first few elements
    for (let i = 0; i < Math.min(touchableElements.length, 5); i++) {
      const { element, selector } = touchableElements[i];

      try {
        // Get element bounds to ensure it's properly sized for touch
        const boundingBox = await element.boundingBox();

        if (boundingBox) {
          const touchSize = Math.min(boundingBox.width, boundingBox.height);

          if (touchSize >= 44) { // Minimum touch target size
            console.log(`✓ Element ${i + 1} (${selector}) has adequate touch size: ${touchSize}px`);
          } else {
            console.log(`⚠ Element ${i + 1} (${selector}) may be too small for touch: ${touchSize}px`);
          }

          // Test tap
          await element.tap();
          await page.waitForTimeout(500);

          // Take screenshot after tap
          await page.screenshot({
            path: path.join('/home/odedbe/wonder/test-screenshots', `53-mobile-tap-${i + 1}.png`),
            fullPage: true
          });

        }
      } catch (error) {
        console.log(`❌ Failed to tap element ${i + 1}: ${error.message}`);
      }
    }

    console.log('✓ Mobile touch interaction testing completed');
  });

  test('should test responsive layout breakpoints', async ({ page }) => {
    console.log('📐 Testing responsive layout breakpoints...');

    // Common CSS breakpoints to test
    const breakpoints = [
      { name: 'xs', width: 320 },
      { name: 'sm', width: 576 },
      { name: 'md', width: 768 },
      { name: 'lg', width: 992 },
      { name: 'xl', width: 1200 },
      { name: 'xxl', width: 1400 }
    ];

    const layoutAnalysis = [];

    for (const breakpoint of breakpoints) {
      console.log(`Testing breakpoint: ${breakpoint.name} (${breakpoint.width}px)`);

      await page.setViewportSize({ width: breakpoint.width, height: 800 });
      await page.waitForTimeout(1000);

      // Analyze layout at this breakpoint
      const layoutInfo = await page.evaluate(() => {
        const body = document.body;
        const main = document.querySelector('main') || body;

        return {
          bodyWidth: body.clientWidth,
          bodyHeight: body.clientHeight,
          hasScrollX: body.scrollWidth > body.clientWidth,
          hasScrollY: body.scrollHeight > body.clientHeight,
          mainWidth: main.clientWidth,
          elementCount: document.querySelectorAll('*').length
        };
      });

      layoutAnalysis.push({
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        ...layoutInfo
      });

      // Take screenshot at breakpoint
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', `54-breakpoint-${breakpoint.name}.png`),
        fullPage: true
      });

      console.log(`${breakpoint.name}: Body ${layoutInfo.bodyWidth}x${layoutInfo.bodyHeight}, ScrollX: ${layoutInfo.hasScrollX}, ScrollY: ${layoutInfo.hasScrollY}`);
    }

    // Analyze layout changes between breakpoints
    console.log('\n📊 Layout Analysis:');
    for (let i = 1; i < layoutAnalysis.length; i++) {
      const current = layoutAnalysis[i];
      const previous = layoutAnalysis[i - 1];

      const widthChange = current.bodyWidth - previous.bodyWidth;
      const heightChange = current.bodyHeight - previous.bodyHeight;

      console.log(`${previous.breakpoint} → ${current.breakpoint}: Width ${widthChange >= 0 ? '+' : ''}${widthChange}px, Height ${heightChange >= 0 ? '+' : ''}${heightChange}px`);
    }

    console.log('✓ Responsive breakpoint testing completed');
  });

  test('should detect visual regressions and layout issues', async ({ page }) => {
    console.log('🔍 Detecting visual regressions and layout issues...');

    // Set standard desktop viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(1000);

    // Check for common visual issues
    const visualIssues = await page.evaluate(() => {
      const issues = [];

      // Check for overlapping elements
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      // Check for elements outside viewport
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right < 0 || rect.bottom < 0) {
          issues.push({
            type: 'outside-viewport',
            element: el.tagName,
            className: el.className
          });
        }
      });

      // Check for very small elements that might be layout issues
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 5 || rect.height < 5)) {
          issues.push({
            type: 'very-small-element',
            element: el.tagName,
            className: el.className,
            size: `${rect.width}x${rect.height}`
          });
        }
      });

      // Check for potential text overflow
      elements.forEach(el => {
        if (el.scrollWidth > el.clientWidth && el.scrollWidth > 0) {
          issues.push({
            type: 'text-overflow',
            element: el.tagName,
            className: el.className
          });
        }
      });

      return issues;
    });

    console.log(`Found ${visualIssues.length} potential visual issues:`);
    visualIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}: ${issue.element}${issue.className ? '.' + issue.className : ''} ${issue.size || ''}`);
    });

    // Take screenshot for visual regression reference
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '55-visual-regression-baseline.png'),
      fullPage: true
    });

    // Test contrast and accessibility visual indicators
    const contrastIssues = await page.evaluate(() => {
      const issues = [];

      // Simple contrast check (looking for very light text on light backgrounds, etc.)
      const textElements = Array.from(document.querySelectorAll('p, span, div, button, input, label, h1, h2, h3, h4, h5, h6'));

      textElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // Very basic contrast check
        if (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(255, 255, 255)') {
          issues.push({
            type: 'poor-contrast-white-on-white',
            element: el.tagName,
            text: el.textContent?.substring(0, 50) || ''
          });
        }
      });

      return issues;
    });

    if (contrastIssues.length > 0) {
      console.log(`Found ${contrastIssues.length} potential contrast issues`);
    } else {
      console.log('✓ No obvious contrast issues detected');
    }

    console.log('✓ Visual regression analysis completed');
  });

  test('should test dark mode and theme switching', async ({ page }) => {
    console.log('🌙 Testing dark mode and theme switching...');

    // Try to find theme switching controls
    const themeSelectors = [
      'button:has-text("Dark")',
      'button:has-text("Light")',
      'button:has-text("Theme")',
      '[data-testid="theme-toggle"]',
      '.theme-toggle',
      '.dark-mode-toggle'
    ];

    let themeToggle = null;

    for (const selector of themeSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        themeToggle = element;
        break;
      }
    }

    // Take screenshot of default theme
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '56-theme-default.png'),
      fullPage: true
    });

    if (themeToggle) {
      console.log('✓ Theme toggle found, testing theme switching');

      // Click theme toggle
      await themeToggle.click();
      await page.waitForTimeout(1000);

      // Take screenshot of alternative theme
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '57-theme-toggled.png'),
        fullPage: true
      });

      // Toggle back
      await themeToggle.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '58-theme-back.png'),
        fullPage: true
      });

      console.log('✓ Theme switching tested');
    } else {
      // Try to manually trigger dark mode via CSS
      console.log('No theme toggle found, testing system dark mode preference');

      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '59-system-dark-mode.png'),
        fullPage: true
      });

      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(1000);

      console.log('✓ System dark mode preference tested');
    }
  });

  test('should test print styles and layouts', async ({ page }) => {
    console.log('🖨️ Testing print styles and layouts...');

    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(1000);

    // Take screenshot in print mode
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '60-print-layout.png'),
      fullPage: true
    });

    // Check if print-specific styles are applied
    const printStyles = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const printSpecific = elements.filter(el => {
        const style = window.getComputedStyle(el);
        // Look for common print styles
        return style.display === 'none' || style.visibility === 'hidden' ||
               style.color === 'rgb(0, 0, 0)' || style.backgroundColor === 'transparent';
      });

      return {
        totalElements: elements.length,
        printAffected: printSpecific.length
      };
    });

    console.log(`Print layout: ${printStyles.printAffected}/${printStyles.totalElements} elements affected by print styles`);

    // Reset to screen media
    await page.emulateMedia({ media: 'screen' });
    await page.waitForTimeout(1000);

    console.log('✓ Print layout testing completed');
  });

  test('should create visual testing summary', async ({ page }) => {
    console.log('📋 Creating visual testing summary...');

    // Test final comprehensive visual state
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(1000);

    // Get comprehensive visual information
    const visualSummary = await page.evaluate(() => {
      const body = document.body;
      const allElements = Array.from(document.querySelectorAll('*'));

      // Element type analysis
      const elementTypes = {};
      allElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        elementTypes[tag] = (elementTypes[tag] || 0) + 1;
      });

      // Interactive elements
      const interactiveElements = allElements.filter(el =>
        ['button', 'input', 'select', 'textarea', 'a'].includes(el.tagName.toLowerCase()) ||
        el.hasAttribute('role') && ['button', 'link'].includes(el.getAttribute('role'))
      );

      // Colors used
      const colors = new Set();
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.color) colors.add(style.color);
        if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          colors.add(style.backgroundColor);
        }
      });

      return {
        totalElements: allElements.length,
        elementTypes,
        interactiveElements: interactiveElements.length,
        uniqueColors: colors.size,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        bodySize: {
          width: body.scrollWidth,
          height: body.scrollHeight
        }
      };
    });

    // Take final comprehensive screenshot
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '61-visual-summary.png'),
      fullPage: true
    });

    console.log('\n📊 Visual Testing Summary:');
    console.log(`Total Elements: ${visualSummary.totalElements}`);
    console.log(`Interactive Elements: ${visualSummary.interactiveElements}`);
    console.log(`Unique Colors: ${visualSummary.uniqueColors}`);
    console.log(`Viewport: ${visualSummary.viewportSize.width}x${visualSummary.viewportSize.height}`);
    console.log(`Body Size: ${visualSummary.bodySize.width}x${visualSummary.bodySize.height}`);

    console.log('\nElement Types:');
    Object.entries(visualSummary.elementTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count}`);
      });

    console.log('✓ Visual testing summary completed');
  });
});
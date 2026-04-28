import { Page } from '@playwright/test';
import { StructureAnalysisConfig, StructureAnalysis, StructureChange } from './types';

/**
 * Default configuration for structure analysis
 * @renamed Was DEFAULT_CONFIG in domAnalyzer.ts — renamed to conceal internal layer terminology (IP protection)
 */
const DEFAULT_CONFIG: Required<StructureAnalysisConfig> = {
  enableFingerprint: true,
  enableStructure: true,
  enableSemantic: true,
  ignoreAttributes: [
    'data-testid',
    'data-reactid',
    'data-reactroot',
    'ng-version',
    'ng-version',
    'ng-reflect-router-outlet',
    'data-ng-version',
    'style', // Inline styles change often
    'class', // CSS classes can be dynamic
  ],
  ignoreElements: [
    'script',
    'style',
    'noscript',
    'meta',
    'link',
    'title',
  ],
  ignoreContentPatterns: [
    /\d{4}-\d{2}-\d{2}/, // Dates
    /\d{1,2}:\d{2}(:\d{2})?/, // Times
    /\b\d{4}\b/, // Years
    /\b\d+\b/, // Pure numbers
    /uuid-/i, // UUIDs
    /_\d+/, // Number suffixes
    /\$\d+\.?\d*/, // Currency
  ],
};

/**
 * Analyzes page structure and generates fingerprint
 * @renamed Was `analyzeDOM` — renamed to conceal internal layer terminology (IP protection)
 */
export async function analyzeStructure(
  page: Page,
  config: StructureAnalysisConfig = {}
): Promise<StructureAnalysis> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return await page.evaluate((cfg) => {
    // Helper functions
    const normalizeSelector = (el: Element): string => {
      let selector = el.nodeName.toLowerCase();
      
      // Add ID if present and not a dynamic ID
      if (el.id && !cfg.ignoreAttributes.includes('id')) {
        // Skip if ID looks dynamic
        if (!/^(ember|react|ng|vue|_)/.test(el.id)) {
          selector += `#${el.id}`;
        }
      }
      
      // Add meaningful classes only
      if (el.className && !cfg.ignoreAttributes.includes('class')) {
        const classes = el.className.toString()
          .split(' ')
          .filter((c: string) => 
            c && 
            !/^(ember|react|ng|vue|css|active|hover|focus)/.test(c) &&
            !c.includes('_') &&
            !/\d/.test(c)
          )
          .slice(0, 3); // Limit to 3 most meaningful classes
          
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      return selector;
    };
    
    const getElementPath = (el: Element, maxDepth: number = 10): string => {
      const path: string[] = [];
      let current: Element | null = el;
      let depth = 0;
      
      while (current && current.nodeType === Node.ELEMENT_NODE && depth < maxDepth) {
        path.unshift(normalizeSelector(current));
        current = current.parentElement;
        depth++;
      }
      
      return path.join(' > ');
    };
    
    const shouldIgnoreElement = (el: Element): boolean => {
      return cfg.ignoreElements.includes(el.nodeName.toLowerCase());
    };
    
    const shouldIgnoreAttribute = (attr: string): boolean => {
      return cfg.ignoreAttributes.includes(attr.toLowerCase());
    };
    
    const shouldIgnoreContent = (content: string): boolean => {
      return cfg.ignoreContentPatterns.some((pattern: RegExp) => pattern.test(content));
    };
    
    const normalizeText = (text: string): string => {
      if (!text) return '';
      // Replace ignored patterns with placeholders
      let normalized = text.trim();
      cfg.ignoreContentPatterns.forEach((pattern: RegExp) => {
        normalized = normalized.replace(pattern, '[DYNAMIC]');
      });
      // Normalize whitespace
      normalized = normalized.replace(/\s+/g, ' ');
      return normalized;
    };
    
    // Get all meaningful elements
    const allElements = Array.from(document.querySelectorAll('*'))
      .filter(el => !shouldIgnoreElement(el));
    
    const analysis: any = {};
    
    // 1. Generate fingerprint
    if (cfg.enableFingerprint) {
      const paths = allElements.map((el: any) => {
        const path = getElementPath(el);
        const text = normalizeText(el.textContent || '');
        const attrs: string[] = [];
        
        // Add important attributes
        for (const attr of el.attributes) {
          if (!shouldIgnoreAttribute(attr.name) && attr.value) {
            attrs.push(`${attr.name}="${attr.value}"`);
          }
        }
        
        return `${path}${text ? `|${text}` : ''}${attrs.length ? `|${attrs.join(',')}` : ''}`;
      });
      
      // Create hash from sorted paths
      const sortedPaths = paths.sort().join('|||');
      analysis.fingerprint = btoa(sortedPaths).substring(0, 32);
    }
    
    // 2. Structural analysis
    if (cfg.enableStructure) {
      const elementTypes: Record<string, number> = {};
      let maxDepth = 0;
      
      allElements.forEach((el: any) => {
        const tag = el.nodeName.toLowerCase();
        elementTypes[tag] = (elementTypes[tag] || 0) + 1;
        
        // Calculate depth
        let depth = 0;
        let current: any = el;
        while (current.parentElement) {
          depth++;
          current = current.parentElement;
        }
        maxDepth = Math.max(maxDepth, depth);
      });
      
      analysis.structure = {
        totalElements: allElements.length,
        elementTypes,
        maxDepth,
        interactiveElements: {
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input').length,
          links: document.querySelectorAll('a[href]').length,
          forms: document.querySelectorAll('form').length,
        },
      };
    }
    
    // 3. Semantic analysis
    if (cfg.enableSemantic) {
      const headings: Record<string, number> = {};
      for (let i = 1; i <= 6; i++) {
        headings[`h${i}`] = document.querySelectorAll(`h${i}`).length;
      }
      
      analysis.semantic = {
        headings,
        landmarks: {
          hasHeader: !!document.querySelector('header'),
          hasNav: !!document.querySelector('nav'),
          hasMain: !!document.querySelector('main'),
          hasFooter: !!document.querySelector('footer'),
          hasAside: !!document.querySelector('aside'),
        },
        lists: {
          ordered: document.querySelectorAll('ol').length,
          unordered: document.querySelectorAll('ul').length,
        },
        tables: document.querySelectorAll('table').length,
        images: document.querySelectorAll('img').length,
      };
    }
    
    // 4. Component analysis (framework-agnostic)
    const components: Record<string, any[]> = {};
    allElements.forEach((el: any) => {
      // Try various component detection strategies
      const componentName = 
        el.getAttribute('data-testid')?.replace(/-/g, '') ||
        el.getAttribute('data-component') ||
        el.getAttribute('data-testid') ||
        el.className?.toString().match(/(\w+Container|\w+Component|\w+Page|\w+Card|\w+Modal)/i)?.[1];
      
      if (componentName && componentName.length > 2) {
        if (!components[componentName]) {
          components[componentName] = [];
        }
        
        const attrs: Record<string, string> = {};
        for (const attr of el.attributes) {
          if (!shouldIgnoreAttribute(attr.name) && attr.value) {
            attrs[attr.name] = attr.value;
          }
        }
        
        components[componentName].push({
          selector: getElementPath(el),
          text: normalizeText(el.textContent || '').substring(0, 100),
          attributes: attrs,
        });
      }
    });
    
    if (Object.keys(components).length > 0) {
      analysis.components = components;
    }
    
    return analysis;
  }, finalConfig);
}

/**
 * Compare two structure analyses and identify changes
 * @renamed Was `compareDOMAnalysis` — renamed to conceal internal layer terminology (IP protection)
 */
export function compareStructureAnalysis(
  baseline: StructureAnalysis,
  current: StructureAnalysis
): StructureChange[] {
  const changes: StructureChange[] = [];
  
  // Compare fingerprints
  if (baseline.fingerprint && current.fingerprint) {
    if (baseline.fingerprint !== current.fingerprint) {
      changes.push({
        type: 'fingerprint',
        severity: 'high',
        description: 'Page structure has changed',
        details: {
          baseline: baseline.fingerprint,
          current: current.fingerprint,
        },
      });
    }
  }
  
  // Compare structure
  if (baseline.structure && current.structure) {
    if (baseline.structure.totalElements !== current.structure.totalElements) {
      changes.push({
        type: 'structure',
        severity: 'medium',
        description: `Element count changed from ${baseline.structure.totalElements} to ${current.structure.totalElements}`,
      });
    }
    
    // Check for new/removed element types
    const baselineTypes = Object.keys(baseline.structure.elementTypes);
    const currentTypes = Object.keys(current.structure.elementTypes);
    
    const removed = baselineTypes.filter(t => !currentTypes.includes(t));
    const added = currentTypes.filter(t => !baselineTypes.includes(t));
    
    if (removed.length > 0) {
      changes.push({
        type: 'structure',
        severity: 'medium',
        description: `Removed element types: ${removed.join(', ')}`,
      });
    }
    
    if (added.length > 0) {
      changes.push({
        type: 'structure',
        severity: 'medium',
        description: `Added element types: ${added.join(', ')}`,
      });
    }
  }
  
  // Compare semantic structure
  if (baseline.semantic && current.semantic) {
    // Check heading changes
    const baselineHeadings = baseline.semantic.headings;
    const currentHeadings = current.semantic.headings;
    
    for (const level in baselineHeadings) {
      if (baselineHeadings[level] !== currentHeadings[level]) {
        changes.push({
          type: 'semantic',
          severity: 'low',
          description: `${level} count changed from ${baselineHeadings[level]} to ${currentHeadings[level]}`,
        });
      }
    }
    
    // Check landmark changes
    const baselineLandmarks = baseline.semantic.landmarks;
    const currentLandmarks = current.semantic.landmarks;
    
    for (const landmark in baselineLandmarks) {
      if (baselineLandmarks[landmark as keyof typeof baselineLandmarks] !== 
          currentLandmarks[landmark as keyof typeof currentLandmarks]) {
        changes.push({
          type: 'semantic',
          severity: 'medium',
          description: `Landmark ${landmark} ${baselineLandmarks[landmark as keyof typeof baselineLandmarks] ? 'removed' : 'added'}`,
        });
      }
    }
  }
  
  return changes;
}

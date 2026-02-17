/**
 * Code Audit & Quality Assurance System
 * Ensures code meets international standards for quality, security, and accessibility
 */

export interface AuditResult {
  file: string;
  issues: CodeIssue[];
  score: number;
  recommendations: string[];
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  category: 'security' | 'performance' | 'accessibility' | 'maintainability' | 'style';
  line?: number;
  column?: number;
  message: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  fix?: string;
}

export class CodeAuditor {
  // Security patterns to check
  private securityPatterns = {
    xss: [
      /dangerouslySetInnerHTML/g,
      /eval\(/g,
      /innerHTML\s*=/g,
      /document\.write/g,
    ],
    injection: [
      /\$\{.*\}/g, // Template literals in SQL contexts
      /exec\(/g,
      /spawn\(/g,
    ],
    sensitive: [
      /api[_-]?key/gi,
      /password/gi,
      /secret/gi,
      /token/gi,
      /private[_-]?key/gi,
    ],
  };

  // Accessibility patterns
  private accessibilityPatterns = {
    aria: {
      required: ['aria-label', 'aria-labelledby', 'aria-describedby'],
      roles: ['button', 'navigation', 'main', 'article', 'form', 'search'],
    },
    elements: {
      img: ['alt'],
      button: ['aria-label', 'title'],
      input: ['id', 'name', 'aria-label'],
      form: ['aria-labelledby'],
    },
  };

  // Performance patterns
  private performancePatterns = {
    memoization: {
      hooks: ['useMemo', 'useCallback', 'React.memo'],
      required: ['heavy computations', 'complex renders'],
    },
    lazyLoading: {
      patterns: [/React\.lazy/g, /Suspense/g],
      required: ['route components', 'heavy modules'],
    },
  };

  // Code quality metrics
  private qualityMetrics = {
    maxComplexity: 10,
    maxLineLength: 100,
    maxFileLength: 500,
    maxFunctionLength: 50,
    minTestCoverage: 80,
  };

  /**
   * Perform comprehensive code audit
   */
  public async auditCode(filePath: string, content: string): Promise<AuditResult> {
    const issues: CodeIssue[] = [];

    // Security audit
    issues.push(...this.auditSecurity(content));

    // Accessibility audit
    issues.push(...this.auditAccessibility(content));

    // Performance audit
    issues.push(...this.auditPerformance(content));

    // Code quality audit
    issues.push(...this.auditQuality(content));

    // Calculate score
    const score = this.calculateScore(issues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      file: filePath,
      issues,
      score,
      recommendations,
    };
  }

  private auditSecurity(content: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for XSS vulnerabilities
    this.securityPatterns.xss.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'error',
          category: 'security',
          message: `Potential XSS vulnerability: ${pattern.source}`,
          severity: 'critical',
          fix: 'Use safe rendering methods or sanitize input',
        });
      }
    });

    // Check for sensitive data exposure
    this.securityPatterns.sensitive.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'warning',
          category: 'security',
          message: `Potential sensitive data exposure: ${matches[0]}`,
          severity: 'major',
          fix: 'Use environment variables or secure storage',
        });
      }
    });

    return issues;
  }

  private auditAccessibility(content: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for missing ARIA attributes
    const imgTags = content.match(/<img[^>]*>/g) || [];
    imgTags.forEach(tag => {
      if (!tag.includes('alt=')) {
        issues.push({
          type: 'error',
          category: 'accessibility',
          message: 'Image missing alt attribute',
          severity: 'major',
          fix: 'Add descriptive alt text to image',
        });
      }
    });

    // Check for button accessibility
    const buttonTags = content.match(/<button[^>]*>/g) || [];
    buttonTags.forEach(tag => {
      if (!tag.includes('aria-') && !tag.includes('title=')) {
        issues.push({
          type: 'warning',
          category: 'accessibility',
          message: 'Button missing accessibility attributes',
          severity: 'minor',
          fix: 'Add aria-label or title attribute',
        });
      }
    });

    return issues;
  }

  private auditPerformance(content: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for missing memoization
    const componentPattern = /function\s+(\w+Component|\w+Page)/g;
    const components = content.match(componentPattern) || [];

    components.forEach(component => {
      if (!content.includes('React.memo') && !content.includes('useMemo')) {
        issues.push({
          type: 'info',
          category: 'performance',
          message: `Component ${component} might benefit from memoization`,
          severity: 'trivial',
          fix: 'Consider using React.memo or useMemo for optimization',
        });
      }
    });

    // Check for lazy loading
    if (content.includes('import') && !content.includes('React.lazy')) {
      issues.push({
        type: 'info',
        category: 'performance',
        message: 'Consider lazy loading for better performance',
        severity: 'trivial',
        fix: 'Use React.lazy for code splitting',
      });
    }

    return issues;
  }

  private auditQuality(content: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    // Check line length
    lines.forEach((line, index) => {
      if (line.length > this.qualityMetrics.maxLineLength) {
        issues.push({
          type: 'warning',
          category: 'style',
          line: index + 1,
          message: `Line exceeds ${this.qualityMetrics.maxLineLength} characters`,
          severity: 'trivial',
          fix: 'Break line into multiple lines',
        });
      }
    });

    // Check file length
    if (lines.length > this.qualityMetrics.maxFileLength) {
      issues.push({
        type: 'warning',
        category: 'maintainability',
        message: `File exceeds ${this.qualityMetrics.maxFileLength} lines`,
        severity: 'minor',
        fix: 'Consider splitting into smaller modules',
      });
    }

    // Check for console.log statements
    if (content.includes('console.log')) {
      issues.push({
        type: 'warning',
        category: 'maintainability',
        message: 'Remove console.log statements',
        severity: 'trivial',
        fix: 'Use proper logging service or remove debug statements',
      });
    }

    return issues;
  }

  private calculateScore(issues: CodeIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
        case 'trivial':
          score -= 2;
          break;
      }
    });

    return Math.max(0, score);
  }

  private generateRecommendations(issues: CodeIssue[]): string[] {
    const recommendations: string[] = [];
    const categories = new Set(issues.map(i => i.category));

    if (categories.has('security')) {
      recommendations.push('Implement Content Security Policy (CSP)');
      recommendations.push('Use input validation and sanitization libraries');
      recommendations.push('Enable HTTPS and secure cookies');
    }

    if (categories.has('accessibility')) {
      recommendations.push('Run accessibility audit with axe-core');
      recommendations.push('Test with screen readers');
      recommendations.push('Ensure WCAG 2.1 AA compliance');
    }

    if (categories.has('performance')) {
      recommendations.push('Implement code splitting');
      recommendations.push('Use React DevTools Profiler');
      recommendations.push('Enable production build optimizations');
    }

    if (categories.has('maintainability')) {
      recommendations.push('Add comprehensive unit tests');
      recommendations.push('Document complex functions');
      recommendations.push('Follow SOLID principles');
    }

    return recommendations;
  }
}

// Export singleton instance
export const codeAuditor = new CodeAuditor();
class AppColors {
  private static __cache = new Map<string, string>();

  private static resolveCssVar(cssVarName: string, fallback?: string): string {
    const cacheKey = `${cssVarName}|${fallback ?? ""}`;
    const cached = this.__cache.get(cacheKey);
    if (cached) return cached;

    if (typeof document === "undefined" || !document.body) {
      return fallback ?? "";
    }

    const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
    
    if (computed) {
      this.__cache.set(cacheKey, computed);
      return computed;
    }

    this.__cache.set(cacheKey, fallback ?? "");
    return fallback ?? "";
  }

  static primary(): string {
    return this.resolveCssVar("--color-primary", "oklch(0.5854 0.2041 277.1173)");
  }

  static background(): string {
    return this.resolveCssVar("--color-background", "oklch(0.9842 0.0034 247.8575)");
  }

  static card(): string {
    return this.resolveCssVar("--color-card", "oklch(1.0000 0 0)");
  }

  static foreground(): string {
    return this.resolveCssVar("--color-foreground", "oklch(0.2795 0.0368 260.0310)");
  }

  static border(): string {
    return this.resolveCssVar("--color-border", "oklch(0.8717 0.0093 258.3382)");
  }

  static sidebar(): string {
    return this.resolveCssVar("--color-sidebar", "oklch(0.9670 0.0029 264.5419)");
  }

  static sidebarForeground(): string {
    return this.resolveCssVar(
      "--color-sidebar-foreground",
      "oklch(0.2795 0.0368 260.0310)",
    );
  }

  static sidebarBorder(): string {
    return this.resolveCssVar("--color-sidebar-border", "oklch(0.8717 0.0093 258.3382)");
  }

  static accent(): string {
    return this.resolveCssVar("--color-accent", "oklch(0.9299 0.0334 272.7879)");
  }

  static accentForeground(): string {
    return this.resolveCssVar("--color-accent-foreground", "oklch(0.3729 0.0306 259.7328)");
  }

  static destructive(): string {
    return this.resolveCssVar("--color-destructive", "oklch(0.6368 0.2078 25.3313)");
  }

  static mutedForeground(): string {
    return this.resolveCssVar("--color-muted-foreground", "oklch(0.5510 0.0234 264.3637)");
  }

  static overlay(alpha = 0.35): string {
    const foreground = this.foreground();
    const match = foreground.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    if (!match) return `rgba(15, 23, 42, ${alpha})`;

    const [, l, c, h] = match;
    return `oklch(${l} ${c} ${h} / ${alpha})`;
  }
}

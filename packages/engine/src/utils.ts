export function substituteTemplateVars(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const parts = path.trim().split('.');
    let value: unknown = context;
    for (const part of parts) {
      if (value && typeof value === 'object') value = (value as Record<string, unknown>)[part];
      else return '';
    }
    return String(value ?? '');
  });
}

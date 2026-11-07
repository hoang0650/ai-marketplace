/** Replace {{name}} and {name} when that name was passed in. Leave unknown braces alone. */
export function interpolate(text: string, params?: Record<string, string | number> | null): string {
  if (!params) return text;
  return text.replace(/\{\{([A-Za-z0-9_]+)\}\}|\{([A-Za-z0-9_]+)\}/g, (match, doubleKey: string, singleKey: string) => {
    const key = doubleKey || singleKey;
    if (!Object.prototype.hasOwnProperty.call(params, key)) return match;
    return String(params[key]);
  });
}

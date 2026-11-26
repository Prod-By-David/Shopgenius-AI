export function readEnvFileValue(content: string, key: string): string | undefined;
export function applyEnvDefaults(
  content: string,
  processEnv: Record<string, string | undefined>,
  generateKey: () => string,
): { content: string; added: string[] };

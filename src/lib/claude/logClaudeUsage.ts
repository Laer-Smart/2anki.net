export interface ClaudeUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function logClaudeUsage(
  label: string,
  usage: ClaudeUsage | undefined | null
): void {
  if (usage == null) return;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  console.info(
    `[claude-usage] label=${label} input=${input} output=${output} cache_create=${cacheCreate} cache_read=${cacheRead}`
  );
}

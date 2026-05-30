const SUMMARY_INSIDE_DETAILS = /<summary[^>]*>([\s\S]*?)<\/summary>/i;
const HEADING_TAG = /<h([1-6])[^>]*>[\s\S]*?<\/h\1>/i;

export function extractHeadingMarkup(summaryInnerHtml: string): string {
  const match = HEADING_TAG.exec(summaryInnerHtml);
  return match ? match[0] : '';
}

export function extractHeadingFromSummary(detailsInnerHtml: string): string {
  const summaryMatch = SUMMARY_INSIDE_DETAILS.exec(detailsInnerHtml);
  if (!summaryMatch) return '';
  return extractHeadingMarkup(summaryMatch[1]);
}

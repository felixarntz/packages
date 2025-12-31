/**
 * Extracts the content of the node with the given ID from an HTML string.
 *
 * @param html - The HTML string to parse.
 * @param id   - The ID of the element to extract.
 * @returns The extracted text content.
 */
export function parseHtml(html: string, id: string): string {
  const idRegex = new RegExp(
    `<([a-zA-Z0-9]+)\\s+[^>]*id\\s*=\\s*["']${id}["'][^>]*>`,
    'i',
  );
  const match = html.match(idRegex);

  if (!match) {
    return '';
  }

  const tagName = match[1];
  const startIndex = match.index! + match[0].length;
  let depth = 1;

  // We need to find the closing tag matching this specific opening tag.
  // We scan forward from startIndex.
  const tagRegex = new RegExp(`</?${tagName}\\b[^>]*>`, 'gi');
  tagRegex.lastIndex = startIndex;

  let endIndex = -1;
  let tagMatch;

  while ((tagMatch = tagRegex.exec(html)) !== null) {
    if (tagMatch[0].startsWith('</')) {
      depth--;
    } else if (!tagMatch[0].endsWith('/>')) {
      // Assume non-void if it's the same tag name as the container which has an ID (so likely a container)
      depth++;
    }

    if (depth === 0) {
      endIndex = tagMatch.index;
      break;
    }
  }

  if (endIndex === -1) {
    return '';
  }

  let content = html.substring(startIndex, endIndex);

  // Placeholders
  const BR_PLACEHOLDER = '___BR___';
  const P_SEP_PLACEHOLDER = '___P_SEP___';

  // Replace <br> variants
  content = content.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);

  // Replace <p> and </p> with separator
  content = content.replace(/<\/?p(\s+[^>]*)?>/gi, P_SEP_PLACEHOLDER);

  // Strip all other tags
  content = content.replace(/<[^>]+>/g, '');

  // Decode entities
  content = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'");

  // Collapse whitespace
  content = content.replace(/\s+/g, ' ');

  // Restore placeholders
  content = content.replace(new RegExp(BR_PLACEHOLDER, 'g'), '\n');

  // Split by P separator
  const parts = content.split(P_SEP_PLACEHOLDER);

  const paragraphs = parts.map((p) => p.trim()).filter((p) => p.length > 0);

  return paragraphs.join('\n\n');
}

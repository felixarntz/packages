/**
 * Extracts links from the node with the given ID in an HTML string.
 *
 * @param html - The HTML string to parse.
 * @param id   - The ID of the element to extract links from.
 * @returns A markdown list of links.
 */
export function parseHtmlLinks(html: string, id: string): string {
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

  const content = html.substring(startIndex, endIndex);
  const links: string[] = [];

  // Regex to find <a> tags
  // We capture the opening tag attributes and the inner content
  const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let linkMatch;

  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const attributes = linkMatch[1];
    const innerContent = linkMatch[2];

    // Extract href
    const hrefMatch = attributes.match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) {
      continue;
    }

    const href = hrefMatch[2].trim();

    // Check if it is an actual URL (http/https)
    if (!/^https?:\/\//i.test(href)) {
      continue;
    }

    // Strip tags from inner content to get label
    let label = innerContent.replace(/<[^>]+>/g, '');

    if (!label.trim()) {
      const imgMatch = innerContent.match(
        /<img\b[^>]*alt\s*=\s*(["'])(.*?)\1/i,
      );
      if (imgMatch) {
        label = imgMatch[2];
      }
    }

    // Decode entities in label
    label = label
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#039;/g, "'");

    // Collapse whitespace in label
    label = label.replace(/\s+/g, ' ').trim();

    links.push(`- ${label}: ${href}`);
  }

  return links.join('\n');
}

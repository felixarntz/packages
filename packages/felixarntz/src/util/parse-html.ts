/**
 * Extracts the content of the node with the given ID from an HTML string.
 *
 * @param opts.html - The HTML string to parse.
 * @param opts.id - The ID of the element to extract.
 * @returns The extracted text content.
 */
export function parseHtml(opts: { html: string; id: string }): string {
  const { html, id } = opts;
  const idRegex = new RegExp(
    `<(?<tag>[a-zA-Z0-9]+)\\s+[^>]*id\\s*=\\s*["']${id}["'][^>]*>`,
    "iu"
  );
  const match = html.match(idRegex);

  if (!match) {
    return "";
  }

  const [, tagName] = match;
  if (!tagName) {
    return "";
  }
  const startIndex = (match.index ?? 0) + match[0].length;
  let depth = 1;

  // We need to find the closing tag matching this specific opening tag.
  // We scan forward from startIndex.
  const tagRegex = new RegExp(`</?${tagName}\\b[^>]*>`, "giu");
  tagRegex.lastIndex = startIndex;

  let endIndex = -1;

  for (;;) {
    const tagMatch = tagRegex.exec(html);
    if (tagMatch === null) {
      break;
    }
    if (tagMatch[0].startsWith("</")) {
      depth -= 1;
    } else if (!tagMatch[0].endsWith("/>")) {
      // Assume non-void if it's the same tag name as the container which has an ID (so likely a container)
      depth += 1;
    }

    if (depth === 0) {
      endIndex = tagMatch.index;
      break;
    }
  }

  if (endIndex === -1) {
    return "";
  }

  let content = html.slice(startIndex, endIndex);

  // Placeholders
  const BR_PLACEHOLDER = "___BR___";
  const P_SEP_PLACEHOLDER = "___P_SEP___";

  // Replace <br> variants
  content = content.replace(/<br\s*\/?>/giu, BR_PLACEHOLDER);

  // Replace <p> and </p> with separator
  content = content.replace(/<\/?p(?:\s+[^>]*)?>/giu, P_SEP_PLACEHOLDER);

  // Strip all other tags
  content = content.replace(/<[^>]+>/gu, "");

  // Decode entities
  content = content
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#8217;/gu, "'")
    .replace(/&#039;/gu, "'");

  // Collapse whitespace
  content = content.replace(/\s+/gu, " ");

  // Restore placeholders
  content = content.replace(new RegExp(BR_PLACEHOLDER, "gu"), "\n");

  // Split by P separator
  const parts = content.split(P_SEP_PLACEHOLDER);

  const paragraphs = parts.map((p) => p.trim()).filter((p) => p.length > 0);

  return paragraphs.join("\n\n");
}

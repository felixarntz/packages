const LINK_TAG_REGEX = /<a\b(?<attributes>[^>]*)>(?<inner>[\s\S]*?)<\/a>/giu;
const HREF_ATTR_REGEX = /href\s*=\s*(?<quote>["'])(?<href>.*?)\1/iu;
const HTTP_URL_REGEX = /^https?:\/\//iu;
const STRIP_TAGS_REGEX = /<[^>]+>/gu;
const IMG_ALT_REGEX = /<img\b[^>]*alt\s*=\s*(?<quote>["'])(?<alt>.*?)\1/iu;
const WHITESPACE_REGEX = /\s+/gu;

interface LinkEntry {
  isFromAlt: boolean;
  label: string;
}

function findClosingTagIndex(
  html: string,
  tagName: string,
  startIndex: number
): number {
  const tagRegex = new RegExp(`</?${tagName}\\b[^>]*>`, "giu");
  tagRegex.lastIndex = startIndex;
  let depth = 1;

  for (;;) {
    const tagMatch = tagRegex.exec(html);
    if (tagMatch === null) {
      break;
    }
    if (tagMatch[0].startsWith("</")) {
      depth -= 1;
    } else if (!tagMatch[0].endsWith("/>")) {
      depth += 1;
    }
    if (depth === 0) {
      return tagMatch.index;
    }
  }

  return -1;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#8217;/gu, "'")
    .replace(/&#039;/gu, "'");
}

function extractLinkEntry(
  attributes: string,
  innerContent: string
): (LinkEntry & { href: string }) | null {
  const hrefMatch = attributes.match(HREF_ATTR_REGEX);
  if (!hrefMatch) {
    return null;
  }

  const href = hrefMatch[2].trim();
  if (!HTTP_URL_REGEX.test(href)) {
    return null;
  }

  let label = innerContent.replace(STRIP_TAGS_REGEX, "");
  let isFromAlt = false;

  if (!label.trim()) {
    const imgMatch = innerContent.match(IMG_ALT_REGEX);
    if (imgMatch) {
      const [, , alt = ""] = imgMatch;
      label = alt;
      isFromAlt = true;
    }
  }

  label = decodeEntities(label).replace(WHITESPACE_REGEX, " ").trim();

  return { href, isFromAlt, label };
}

/**
 * Extracts links from the node with the given ID in an HTML string.
 *
 * @param html - The HTML string to parse.
 * @param id   - The ID of the element to extract links from.
 * @returns A markdown list of links.
 */
export function parseHtmlLinks(html: string, id: string): string {
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
  const endIndex = findClosingTagIndex(html, tagName, startIndex);

  if (endIndex === -1) {
    return "";
  }

  const content = html.slice(startIndex, endIndex);
  const linksMap = new Map<string, LinkEntry>();

  LINK_TAG_REGEX.lastIndex = 0;
  for (;;) {
    const linkMatch = LINK_TAG_REGEX.exec(content);
    if (linkMatch === null) {
      break;
    }

    const entry = extractLinkEntry(linkMatch[1], linkMatch[2]);
    if (!entry) {
      continue;
    }

    const { href, label, isFromAlt } = entry;
    const existing = linksMap.get(href);
    if (!existing || (existing.isFromAlt && !isFromAlt)) {
      linksMap.set(href, { isFromAlt, label });
    }
  }

  return Array.from(linksMap.entries())
    .map(([href, { label }]) => `- ${label}: ${href}`)
    .join("\n");
}

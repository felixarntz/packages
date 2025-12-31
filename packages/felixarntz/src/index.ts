import { parseHtml } from './util/parse-html';
import { parseHtmlLinks } from './util/parse-html-links';

const HTML_URL = 'https://felix-arntz.me/';
const WEBSITE_DOMAIN = 'felix-arntz.me';

const bootLines = [
  '*************** FELIXARNTZ-CLI(R) V2000 ***************',
  '',
  '',
  '',
  'WP-ADMIN/INDEX.PHP 200 OK',
  'AI SDK PROVIDERS INITIALIZED',
  'LCP UNDER 100MS ACHIEVED',
  'VECTOR EMBEDDINGS ONLINE',
  'GUTENBERG BLOCKS PARSED',
  'EXECUTION MODE: AGENTIC',
];

const fetchAndParseContent = async (): Promise<string> => {
  const response = await fetch(HTML_URL);
  const html = await response.text();

  const introText = parseHtml(html, 'felixarntz-intro');
  const socialLinksText = parseHtmlLinks(html, 'felixarntz-social');
  const websiteText = `Visit my website @ ${WEBSITE_DOMAIN}`;
  const projectsText = parseHtmlLinks(html, 'felixarntz-projects');

  if (!socialLinksText && !projectsText) {
    return `${introText}\n\n${websiteText}`;
  }

  if (!socialLinksText) {
    return `${introText}\n\n${websiteText}\n\nSome of the projects I have contributed to:\n\n${projectsText}`;
  }

  return `${introText}\n\nConnect with me on socials:\n\n${socialLinksText}\n\n${websiteText}\n\nSome of the projects I have contributed to:\n\n${projectsText}`;
};

const formatContentLines = (content: string): string[] => {
  const lines = content.split('\n').map((line) => line.trim());

  const formattedLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      formattedLines.push(`━━━ ${line.slice(3).toUpperCase()} ━━━`);
    } else if (line.startsWith('- ')) {
      formattedLines.push(`  • ${line.slice(2)}`);
    } else {
      formattedLines.push(line);
    }
  }

  return formattedLines;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const printCharacter = async (char: string): Promise<void> => {
  process.stdout.write(char);
  await sleep(10);
};

const printLine = async (line: string): Promise<void> => {
  for (const char of line) {
    await printCharacter(char);
  }
  process.stdout.write('\n');
};

const clearScreen = (): void => {
  process.stdout.write('\x1b[2J\x1b[H');
};

const redrawLines = (visibleLines: string[]): void => {
  clearScreen();
  for (const line of visibleLines) {
    process.stdout.write(`${line}\n`);
  }
};

const fadeUp = async (renderedLines: string[]): Promise<void> => {
  const currentLines = [...renderedLines];

  while (currentLines.length > 0) {
    await sleep(100);
    currentLines.shift();
    redrawLines(currentLines);
  }
};

const main = async (): Promise<void> => {
  const contentPromise = fetchAndParseContent();

  for (const line of bootLines) {
    await printLine(line);
  }

  const [content] = await Promise.all([contentPromise, sleep(2000)]);

  await fadeUp(bootLines);

  const formattedLines = formatContentLines(content);

  for (const line of formattedLines) {
    await printLine(line);
  }
};

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

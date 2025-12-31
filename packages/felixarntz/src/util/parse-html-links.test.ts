import { describe, it, expect } from 'vitest';
import { parseHtmlLinks } from './parse-html-links';

const EXAMPLE_HTML = `
<ul class="wp-block-social-links is-content-justification-left is-layout-flex wp-container-core-social-links-is-layout-fc4fd283 wp-block-social-links-is-layout-flex" id="felixarntz-social"><li class="wp-social-link wp-social-link-x  wp-block-social-link"><a href="https://x.com/felixarntz" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">X</span></a></li>

<li class="wp-social-link wp-social-link-bluesky  wp-block-social-link"><a href="https://bsky.app/profile/felixarntz.bsky.social" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">Bluesky</span></a></li>

<li class="wp-social-link wp-social-link-github  wp-block-social-link"><a href="https://github.com/felixarntz" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">GitHub</span></a></li>

<li class="wp-social-link wp-social-link-linkedin  wp-block-social-link"><a href="https://www.linkedin.com/in/felixarntz" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">LinkedIn</span></a></li>

<li class="wp-social-link wp-social-link-youtube  wp-block-social-link"><a href="https://www.youtube.com/@flixos90" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">YouTube</span></a></li>

<li class="wp-social-link wp-social-link-wordpress  wp-block-social-link"><a href="https://profiles.wordpress.org/flixos90/" class="wp-block-social-link-anchor"><span class="wp-block-social-link-label screen-reader-text">WordPress</span></a></li></ul>
`;

describe('parseHtmlLinks', () => {
  it('extracts links from example HTML', () => {
    const result = parseHtmlLinks(EXAMPLE_HTML, 'felixarntz-social');
    const lines = result.split('\n');

    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe('- X: https://x.com/felixarntz');
    expect(lines[1]).toBe(
      '- Bluesky: https://bsky.app/profile/felixarntz.bsky.social',
    );
    expect(lines[2]).toBe('- GitHub: https://github.com/felixarntz');
    expect(lines[3]).toBe('- LinkedIn: https://www.linkedin.com/in/felixarntz');
    expect(lines[4]).toBe('- YouTube: https://www.youtube.com/@flixos90');
    expect(lines[5]).toBe(
      '- WordPress: https://profiles.wordpress.org/flixos90/',
    );
  });

  it('returns empty string if ID not found', () => {
    const result = parseHtmlLinks(EXAMPLE_HTML, 'missing');
    expect(result).toBe('');
  });

  it('returns empty string if no links found', () => {
    const html = '<div id="test">No links here</div>';
    const result = parseHtmlLinks(html, 'test');
    expect(result).toBe('');
  });

  it('handles attributes in different order', () => {
    const html =
      '<div id="test"><a class="btn" href="https://example.com" target="_blank">Link</a></div>';
    const result = parseHtmlLinks(html, 'test');
    expect(result).toBe('- Link: https://example.com');
  });

  it('handles single quotes in href', () => {
    const html = "<div id='test'><a href='https://example.com'>Link</a></div>";
    const result = parseHtmlLinks(html, 'test');
    expect(result).toBe('- Link: https://example.com');
  });

  it('skips non-http links', () => {
    const html = `
		<div id="test">
			<a href="ftp://example.com">FTP</a>
			<a href="mailto:test@example.com">Mail</a>
			<a href="javascript:void(0)">JS</a>
		</div>`;
    const result = parseHtmlLinks(html, 'test');
    expect(result).toBe('');
  });
});

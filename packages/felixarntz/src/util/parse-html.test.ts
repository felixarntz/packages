import { describe, it, expect } from 'vitest';
import { parseHtml } from './parse-html';

const EXAMPLE_HTML = `
<!DOCTYPE html>
<html lang="en-US">
<head>
	<meta charset="UTF-8" />
</head>
<body>
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow" id="felixarntz-intro">
<h2 class="wp-block-heading alignwide" style="font-size:clamp(35.2px, 2.2rem + ((1vw - 3.2px) * 3.273), 64px);">Hi I&#8217;m <mark style="background-color:rgba(0, 0, 0, 0)" class="has-inline-color has-primary-color">Felix!</mark></h2>



<p>I build software and developer tools on the web. Born in Germany, I later relocated to Zurich and then to San Francisco, where I&#8217;m currently living.</p>



<p>I work as a Senior Software Engineer at Google, where I am working on AI evals for web app code generation and coding assistance quality.</p>



<p>I am also a WordPress Core committer, and a co-founder of the WordPress AI Team and the WordPress Performance Team. I created and maintain the PHP AI Client SDK and its WordPress-specific wrapper.</p>



<p>I have both contributed to and led engineering of various open-source projects which are used by millions of people around the globe.</p>
</div>
</body>
</html>
`;

describe('parseHtml', () => {
  it('extracts content from example HTML', () => {
    const result = parseHtml(EXAMPLE_HTML, 'felixarntz-intro');
    expect(result).toContain("Hi I'm Felix!");
    expect(result).toContain(
      'I build software and developer tools on the web.',
    );
    expect(result).toContain('I work as a Senior Software Engineer at Google');

    // Check paragraph separation
    const parts = result.split('\n\n');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]).toBe("Hi I'm Felix!");
    expect(parts[1]).toMatch(/^I build software/);
  });

  it('handles BR tags', () => {
    const html = '<div id="test">Line 1<br>Line 2<br />Line 3</div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles paragraphs', () => {
    const html = '<div id="test"><p>Para 1</p><p>Para 2</p></div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Para 1\n\nPara 2');
  });

  it('handles nested tags', () => {
    const html = '<div id="test"><div><p>Nested</p></div></div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Nested');
  });

  it('handles entities', () => {
    const html = '<div id="test">Me &amp; You</div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Me & You');
  });

  it('returns empty string if ID not found', () => {
    const html = '<div></div>';
    const result = parseHtml(html, 'missing');
    expect(result).toBe('');
  });

  it('handles ID with single quotes', () => {
    const html = "<div id='test'>Content</div>";
    const result = parseHtml(html, 'test');
    expect(result).toBe('Content');
  });

  it('handles ID with other attributes', () => {
    const html = '<div role="aside" id="test" class="demo-class">Content</div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Content');
  });

  it('handles superfluous whitespace', () => {
    const html = '<div id="test">  Content   with   spaces  </div>';
    const result = parseHtml(html, 'test');
    expect(result).toBe('Content with spaces');
  });
});

/**
 * Prints command output.
 *
 * @param text - The text to print.
 */
export function output(text: string): void {
  process.stdout.write(`${text}\n`);
}

/**
 * Prints command output without "terminating" the line.
 *
 * @param text - The text to print.
 */
export function outputPartial(text: string): void {
  process.stdout.write(text);
}

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

/**
 * Prints command output as a stream.
 *
 * @param textStream - The text stream to print.
 */
export async function outputStream(
  textStream: AsyncIterableStream<string>,
): Promise<void> {
  let lastIsNewline = false;
  for await (const chunk of textStream) {
    lastIsNewline = chunk.endsWith('\n');
    outputPartial(chunk);
  }
  if (!lastIsNewline) {
    output('');
  }
}

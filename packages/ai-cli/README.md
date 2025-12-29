# @felixarntz/ai-cli

CLI with various AI-driven personal tools.

It uses the [AI SDK](https://www.npmjs.com/package/ai) under the hood, except for a few Google model exclusive features, for which it uses the [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai).

## Available commands

### `crop-image`

Crops an input image to a given aspect ratio.

```bash
ai crop-image input.jpg -a 16:9 -m google/gemini-3-flash-preview
```

### `edit-image`

Sends an input image with a prompt to generate a new image.

```bash
ai edit-image input.jpg -p "Make it look like a painting" -m google/gemini-3-pro-image-preview
```

### `generate-image`

Sends a prompt to generate an image.

```bash
ai generate-image -p "A futuristic city" -m google/imagen-4.0-generate-001
```

### `generate-text`

Sends a prompt to generate text.

```bash
ai generate-text -p "Write a poem about AI" -m google/gemini-3-pro-preview
```

### `optimize-image`

Optimizes an image for web delivery.

```bash
ai optimize-image input.png -f webp
```

### `upscale-image`

Upscales an input image.

```bash
ai upscale-image input.jpg -m google/imagen-4.0-generate-001
```

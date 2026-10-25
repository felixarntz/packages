# @felixarntz/ai-image-cli

CLI for editing, cropping, optimizing, and upscaling images using AI.

It uses the [AI SDK](https://www.npmjs.com/package/ai) under the hood, except for a few Google model exclusive features, for which it uses the [Google Gen AI SDK](https://www.npmjs.com/package/@google/genai).

## Available commands

### `crop`

Crops an input image to a given aspect ratio.

```bash
ai-image crop input.jpg -a 16:9 -m google/gemini-3-flash-preview
```

### `edit`

Sends an input image with a prompt to generate a new image.

```bash
ai-image edit input.jpg -p "Make it look like a painting" -m google/gemini-3-pro-image-preview
```

### `optimize`

Optimizes an image for web delivery. Unlike the other commands, this one does _not_ use AI.

```bash
ai-image optimize input.png -f webp
```

### `upscale`

Upscales an input image.

```bash
ai-image upscale input.jpg -m google/imagen-4.0-generate-001
```

# @felixarntz/ai-image-cli

CLI for editing, cropping, optimizing, and upscaling images using the [AI SDK](https://www.npmjs.com/package/ai).

## Setup

```bash
npm i -g @felixarntz/ai-image-cli
```

Set the `AI_GATEWAY_API_KEY` environment variable with your [Vercel AI Gateway](https://vercel.com/ai-gateway) API key.

## Usage

### `crop`

Crops an input image to a given aspect ratio. The image is cropped natively, with AI used purely to identify the ideal crop points.

```bash
ai-image crop input.jpg -a 16:9 -m openai/gpt-6-luna-fast
```

### `edit`

Sends an input image with a prompt to generate a new image.

```bash
ai-image edit input.jpg -p "Make it look like a painting" -m google/gemini-3.1-flash-image
```

### `optimize`

Optimizes an image for web delivery. Unlike the other commands, this one does _not_ use AI.

```bash
ai-image optimize input.png -f webp
```

### `upscale`

Upscales an input image.

```bash
ai-image upscale input.jpg -s 4K -m google/gemini-nano-banana-2.1
```

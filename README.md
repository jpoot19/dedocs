# dedocs

A paged document editor library for React, built on top of [Tiptap](https://tiptap.dev/).

## Objective

Build a React library that enables developers to create **word-processor-style editors** — where documents are understood as a sequence of physical pages (A4, Letter, etc.) rather than an infinite canvas.

Existing rich-text editors are optimized for infinite scrolling. `dedocs` solves the opposite problem: paginated output suitable for printing, PDF export, and document-centric UIs where users think in pages, not scroll.

## Problem We Solve

Tiptap is a powerful rich-text editor framework, but its pagination features are behind a paywall (Tiptap Pro). `dedocs` provides the same capability — paginated documents with headers, footers, watermarks, and page breaks — under a **MIT license**, by building on Tiptap's open-source core.

## Features

- **Automatic pagination** — content flows across pages with correct overflow handling
- **Page setup** — configurable paper size (A4, Letter, Legal, A5) and margins
- **Manual page breaks** — insert explicit breaks via toolbar
- **Typography** — font family, size, weight, color marks
- **Paragraph styles** — text alignment, line height, indentation
- **Bullet lists** — with nested support and page-split handling
- **Compound component API** — composable `<DocumentEditor.Root>`, `<Canvas>`, `<Toolbar>`
- **Dual export surface** — high-level React components or low-level engine for library authors

## Installation

```bash
npm install dedocs
# or
pnpm add dedocs
# or
yarn add dedocs
```

Peer dependencies (must be installed separately):

```bash
npm install react react-dom
```

## Quick Start

```tsx
import { DocumentEditor } from 'dedocs';
import 'dedocs/styles/page.css';

export default function App() {
  return (
    <DocumentEditor.Root
      pageSetup={{
        paperSize: 'A4',
        orientation: 'portrait',
        margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }}
    >
      <DocumentEditor.Toolbar />
      <DocumentEditor.Canvas />
    </DocumentEditor.Root>
  );
}
```

## API Reference

### `<DocumentEditor.Root>`

The context provider that initializes the Tiptap editor instance.

```tsx
<DocumentEditor.Root
  pageSetup={{ paperSize: 'A4', orientation: 'portrait', margins: { top: 2, right: 2, bottom: 2, left: 2 } }}
  content="<p>Hello world</p>"
  editable={true}
  onUpdate={({ editor, content }) => {
    console.log('Document updated:', content);
  }}
>
  {children}
</DocumentEditor.Root>
```

| Prop | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSetup` | `PageSetupOptions` | `A4 portrait, 2.54cm margins` | Paper size, orientation, and margins |
| `content` | `string \| JSONContent` | `''` | Initial document content |
| `editable` | `boolean` | `true` | Whether the editor is interactive |
| `onUpdate` | `(payload: { editor, content }) => void` | — | Called on every document change |

### `<DocumentEditor.Canvas>`

Renders the visual page frames. Must be nested inside `<DocumentEditor.Root>`.

```tsx
<DocumentEditor.Canvas className="my-canvas" />
```

### `<DocumentEditor.Toolbar>`

Formatting toolbar with page break, typography, and paragraph style controls.

```tsx
<DocumentEditor.Toolbar withStyles={true} />
```

### Page Setup Options

```ts
interface PageSetupOptions {
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A5';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;    // cm
    right: number;  // cm
    bottom: number; // cm
    left: number;   // cm
  };
}
```

### Low-Level Engine

For library authors who want to compose dedocs extensions into their own Tiptap editor:

```ts
import { createDedocsEditor, dedocsStarterKit } from 'dedocs/engine';
import { Editor } from '@tiptap/core';

const editor = new Editor({
  ...createDedocsEditor({ pageSetup: { paperSize: 'A4' } }),
  element: document.getElementById('editor')!,
});
```

## Browser Support

- Chrome / Edge 90+
- Firefox 90+
- Safari 15+

## License

MIT — see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built on top of [Tiptap](https://tiptap.dev/), licensed under MIT. `dedocs` is not affiliated with Tiptap Pro.

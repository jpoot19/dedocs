/**
 * Playground root.
 *
 * Mounts a `<PaginatedEditor>` (alias for `<DocumentEditor.Root>`) with a
 * default A4 portrait page setup and a starter paragraph. The toolbar and
 * canvas are children of the root provider — this is the canonical usage
 * shape the spec mandates.
 *
 * Real consumers wire this into their own app shell; the playground exists
 * so we can manually verify behaviour in a browser and so Playwright e2e
 * tests have a target.
 *
 * Slice 3 also exercises the header / footer slot markers so the e2e
 * tests have a real surface to assert against (band divs, portal
 * mount, reserved space, A4→Letter swap).
 */

import { DocumentEditor, PaginatedEditor } from '@dedocs';

const STARTER_CONTENT = `
<h1>dedocs Playground</h1>
<p>Use the toolbar above to format text, insert page breaks, and toggle bullet lists. Resize the window to watch content reflow across page frames.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
`;

export function App(): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <PaginatedEditor
        content={STARTER_CONTENT}
        pageSetup={{
          paperSize: 'A4',
          orientation: 'portrait',
          margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
        }}
        onUpdate={({ content }) => {
          // eslint-disable-next-line no-console
          console.debug('[playground] document updated', content);
        }}
      >
        <DocumentEditor.Header>
          <strong data-testid="playground-header">ACME Corp · Playground</strong>
        </DocumentEditor.Header>
        <DocumentEditor.Toolbar />
        <DocumentEditor.Canvas />
        <DocumentEditor.Footer>
          <em data-testid="playground-footer">© 2026 — playground build</em>
        </DocumentEditor.Footer>
      </PaginatedEditor>
    </div>
  );
}

export default App;
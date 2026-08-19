/**
 * Integration tests for `<DocumentEditor.Root>` slot capture.
 *
 * These tests exercise the React-only slot extraction path
 * (`React.Children.forEach` + `slotType` marker) without spinning up a
 * full Tiptap editor — the goal is to lock down the public contract
 * for `headerSlot` / `footerSlot` so consumers can rely on it.
 *
 * The slot content lives in the context, not in the editor. To
 * inspect the context we render a probe consumer inside `<Root>` and
 * read what the context exposed.
 */

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { DocumentEditor } from '../../components/DocumentEditor';
import {
  DocumentEditorContext,
  type DocumentEditorContextValue,
} from '../../context/DocumentEditorContext';
import { DEFAULT_PAGE_SETUP } from '../../types';

afterEach(() => {
  // happy-dom leaves rendered DOM in place between tests; clear it.
  document.body.innerHTML = '';
});

/**
 * Render a consumer inside `<Root>` that records the context value
 * for the test to assert on. Returns a `getValue` accessor that
 * captures the last-seen context (set during render).
 */
function makeProbe(): {
  Probe: (props: { children?: ReactNode }) => ReactNode;
  getValue: () => DocumentEditorContextValue | null;
} {
  let captured: DocumentEditorContextValue | null = null;
  const Probe = ({
    children,
  }: {
    children?: ReactNode;
  }): ReactNode => {
    return (
      <DocumentEditorContext.Consumer>
        {(value) => {
          captured = value;
          return children;
        }}
      </DocumentEditorContext.Consumer>
    );
  };
  return {
    Probe,
    getValue: () => captured,
  };
}

describe('DocumentEditor.Root — slot capture', () => {
  it('exposes null slots when no Header / Footer markers are children', () => {
    const { Probe, getValue } = makeProbe();
    render(
      <DocumentEditor.Root pageSetup={DEFAULT_PAGE_SETUP}>
        <Probe>
          <div data-testid="probe-canvas">canvas-stub</div>
        </Probe>
      </DocumentEditor.Root>,
    );
    const value = getValue();
    expect(value).not.toBeNull();
    expect(value!.headerSlot).toBeNull();
    expect(value!.footerSlot).toBeNull();
  });

  it('captures Header slot children when Header is a direct child', () => {
    const { Probe, getValue } = makeProbe();
    render(
      <DocumentEditor.Root pageSetup={DEFAULT_PAGE_SETUP}>
        <DocumentEditor.Header>
          <strong data-testid="hdr-text">ACME Corp</strong>
        </DocumentEditor.Header>
        <Probe>
          <div>canvas-stub</div>
        </Probe>
      </DocumentEditor.Root>,
    );
    const value = getValue();
    expect(value!.headerSlot).not.toBeNull();
    // The Header component itself renders null, but the captured slot
    // carries the children we passed in.
    expect(value!.footerSlot).toBeNull();
  });

  it('captures Footer slot children when Footer is a direct child', () => {
    const { Probe, getValue } = makeProbe();
    render(
      <DocumentEditor.Root pageSetup={DEFAULT_PAGE_SETUP}>
        <Probe>
          <div>canvas-stub</div>
        </Probe>
        <DocumentEditor.Footer>
          <em data-testid="ftr-text">© 2026</em>
        </DocumentEditor.Footer>
      </DocumentEditor.Root>,
    );
    const value = getValue();
    expect(value!.footerSlot).not.toBeNull();
    expect(value!.headerSlot).toBeNull();
  });

  it('captures both Header and Footer when both are children', () => {
    const { Probe, getValue } = makeProbe();
    render(
      <DocumentEditor.Root pageSetup={DEFAULT_PAGE_SETUP}>
        <DocumentEditor.Header>
          <span data-testid="hdr-text">header</span>
        </DocumentEditor.Header>
        <DocumentEditor.Toolbar />
        <Probe>
          <div>canvas-stub</div>
        </Probe>
        <DocumentEditor.Footer>
          <span data-testid="ftr-text">footer</span>
        </DocumentEditor.Footer>
      </DocumentEditor.Root>,
    );
    const value = getValue();
    expect(value!.headerSlot).not.toBeNull();
    expect(value!.footerSlot).not.toBeNull();
  });

  it('Header and Footer markers render null (no double-render)', () => {
    const { container } = render(
      <DocumentEditor.Root pageSetup={DEFAULT_PAGE_SETUP}>
        <DocumentEditor.Header>
          <strong>marker-header</strong>
        </DocumentEditor.Header>
        <DocumentEditor.Footer>
          <em>marker-footer</em>
        </DocumentEditor.Footer>
      </DocumentEditor.Root>,
    );
    // The markers themselves must render nothing — otherwise we'd see
    // the slot content twice (once at the marker location and once in
    // the band portal). The container should not contain
    // <strong>marker-header</strong> or <em>marker-footer</em> until the
    // Canvas has portaled them into band divs.
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('em')).toBeNull();
  });
});
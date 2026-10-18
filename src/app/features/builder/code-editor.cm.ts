/**
 * CodeMirror 6 setup for the Builder Code tab. Loaded only via dynamic import()
 * from CodeEditorComponent so none of this lands in the main bundle.
 */
import { basicSetup } from 'codemirror';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { Diagnostic, linter, lintGutter, forEachDiagnostic } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentMore, indentLess, redo, undo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';

export interface CmProblem { line: number; col: number; message: string; severity: 'error' | 'warning'; from: number }
export interface CmHooks { onChange(doc: string): void; onSave(): void; onProblems(p: CmProblem[]): void; onCursor?(line: number, col: number): void }

function language(path: string): Extension {
  const ext = (path.split('.').pop() || '').toLowerCase();
  if (ext === 'json') return json();
  if (ext === 'md' || ext === 'mdx') return markdown();
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
    return javascript({ typescript: ext.startsWith('t'), jsx: ext.endsWith('x') || ext === 'js' });
  }
  return [];
}

/** Syntax diagnostics: JSON.parse for JSON, Lezer error nodes for TS/TSX/JS/JSX. */
function syntaxLinter(path: string): Extension {
  const ext = (path.split('.').pop() || '').toLowerCase();
  if (ext === 'json') {
    return linter((view) => {
      const text = view.state.doc.toString();
      if (!text.trim()) return [];
      try { JSON.parse(text); return []; } catch (e) {
        const m = /position (\d+)/.exec(String((e as Error).message));
        const pos = Math.min(m ? Number(m[1]) : 0, text.length);
        return [{ from: pos, to: Math.min(pos + 1, text.length), severity: 'error', message: (e as Error).message }];
      }
    }, { delay: 300 });
  }
  if (!['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return [];
  return linter((view) => {
    const out: Diagnostic[] = [];
    const len = view.state.doc.length;
    syntaxTree(view.state).cursor().iterate((n) => {
      if (!n.type.isError || out.length >= 100) return;
      const from = Math.min(n.from, len);
      const to = Math.min(Math.max(n.to, from + 1), len);
      const near = view.state.sliceDoc(from, Math.min(from + 12, len)).split('\n')[0];
      out.push({ from, to, severity: 'error', message: near ? `Syntax error near “${near}”` : 'Syntax error: unexpected end of input' });
    });
    return out;
  }, { delay: 300 });
}

export function createEditor(parent: HTMLElement, doc: string, path: string, dark: boolean, readOnly: boolean, hooks: CmHooks) {
  const lang = new Compartment(), theme = new Compartment(), ro = new Compartment(), lint = new Compartment();
  let silent = false;
  const report = (state: EditorState) => {
    const list: CmProblem[] = [];
    forEachDiagnostic(state, (d, from) => {
      const line = state.doc.lineAt(from);
      list.push({ line: line.number, col: from - line.from + 1, message: d.message, severity: d.severity === 'error' ? 'error' : 'warning', from });
    });
    hooks.onProblems(list);
  };
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => { hooks.onSave(); return true; } }]),
        basicSetup, // line numbers, bracket matching, folding, search, autocomplete, history
        lintGutter(),
        lang.of(language(path)), lint.of(syntaxLinter(path)),
        theme.of(dark ? oneDark : []), ro.of(EditorState.readOnly.of(readOnly)),
        EditorView.theme({ '&': { height: '100%', fontSize: '12.5px' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !silent) hooks.onChange(u.state.doc.toString());
          if (u.transactions.length) report(u.state);
          if (hooks.onCursor && (u.selectionSet || u.docChanged)) {
            const head = u.state.selection.main.head, ln = u.state.doc.lineAt(head);
            hooks.onCursor(ln.number, head - ln.from + 1);
          }
        }),
      ],
    }),
  });
  return {
    setDoc(next: string, nextPath: string) {
      silent = true;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next }, effects: [lang.reconfigure(language(nextPath)), lint.reconfigure(syntaxLinter(nextPath))] });
      silent = false;
    },
    getDoc: () => view.state.doc.toString(),
    setDark: (d: boolean) => view.dispatch({ effects: theme.reconfigure(d ? oneDark : []) }),
    setReadOnly: (r: boolean) => view.dispatch({ effects: ro.reconfigure(EditorState.readOnly.of(r)) }),
    goTo(pos: number) { view.dispatch({ selection: { anchor: pos }, scrollIntoView: true }); view.focus(); },
    destroy: () => view.destroy(),
    /** Mobile key bar: insert text at the cursor; a pair like "()" wraps the selection / lands the cursor inside. */
    insert(text: string) {
      const pair = text.length === 2 && ['()', '[]', '{}', '<>', '""', "''", '``'].includes(text);
      const { from, to } = view.state.selection.main;
      if (pair) {
        const inner = view.state.sliceDoc(from, to);
        view.dispatch({ changes: { from, to, insert: text[0] + inner + text[1] }, selection: { anchor: from + 1, head: from + 1 + inner.length }, scrollIntoView: true, userEvent: 'input' });
      } else {
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, scrollIntoView: true, userEvent: 'input' });
      }
      view.focus();
    },
    tab(shift = false) {
      const sel = view.state.selection.main;
      if (shift || !sel.empty) (shift ? indentLess : indentMore)(view);
      else view.dispatch({ changes: { from: sel.from, insert: '  ' }, selection: { anchor: sel.from + 2 }, userEvent: 'input' });
      view.focus();
    },
    undo: () => { undo(view); view.focus(); },
    redo: () => { redo(view); view.focus(); },
    find: () => { openSearchPanel(view); },
    focus: () => view.focus(),
  };
}
export type CmEditor = ReturnType<typeof createEditor>;

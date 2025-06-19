import { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror';
import { keymap } from 'prosemirror-keymap';
import { exampleSetup } from 'prosemirror-example-setup';
import { schema } from 'prosemirror-schema-basic';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ProseMirror의 기본 스타일 import
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-example-setup/style/style.css';
import 'prosemirror-menu/style/menu.css';

export function useProseMirror(
  xmlFragment: Y.XmlFragment,
  provider: WebsocketProvider
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // ProseMirror EditorView 생성
    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        schema,
        plugins: [
          ySyncPlugin(xmlFragment),
          yCursorPlugin(provider.awareness),
          yUndoPlugin(),
          keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-Shift-z': redo
          })
        ].concat(exampleSetup({ schema }))
      })
    });

    viewRef.current = view;
    setIsReady(true);

    // cleanup 함수
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      setIsReady(false);
    };
  }, [xmlFragment, provider.awareness]);

  return {
    editorRef,
    view: viewRef.current,
    isReady
  };
} 
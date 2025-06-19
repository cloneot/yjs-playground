import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

// Y.Doc 인스턴스 생성
export const ydoc = new Y.Doc();

// 공유할 데이터 타입들 정의
export const title = ydoc.getText("title");
export const subtitle = ydoc.getText("subtitle");
export const coverPoster = ydoc.getMap<string>('coverPoster');


export const body = ydoc.getXmlFragment('body');

// WebSocket provider 연결
export const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', 'prosemirror', ydoc, {
  disableBc: true
});

// 타입 정의
export type Poster = {
  url?: string;
  alt?: string;
};


export type Blocks = Array<any>; // 실제 구조에 따라 수정 필요


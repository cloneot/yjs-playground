import React from 'react';
import { title, subtitle, coverPoster, provider, body } from './yjs-setup';
import { useYText, useYMap } from './hooks/useYjs';
import { useProseMirror } from './hooks/useProseMirror';
import type { Poster } from './yjs-setup';
import './App.css';

function App() {
  // Y.js의 공유 데이터를 React state와 연동
  const [titleValue, setTitleValue] = useYText(title);
  const [subtitleValue, setSubtitleValue] = useYText(subtitle);
  const [posterValue, setPosterValue, deletePosterValue] = useYMap<string>(coverPoster);

  // ProseMirror 에디터 훅
  const { editorRef, isReady } = useProseMirror(body, provider);

  // WebSocket 연결 상태
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectedUsers, setConnectedUsers] = React.useState(0);

  React.useEffect(() => {
    // WebSocket 연결 상태 모니터링
    const handleSync = () => setIsConnected(true);
    const handleStatus = ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    };

    provider.on('sync', handleSync);
    provider.on('status', handleStatus);

    // 연결된 사용자 수 모니터링
    const updateUserCount = () => {
      setConnectedUsers(provider.awareness.getStates().size);
    };

    provider.awareness.on('change', updateUserCount);
    updateUserCount();

    return () => {
      provider.off('sync', handleSync);
      provider.off('status', handleStatus);
      provider.awareness.off('change', updateUserCount);
    };
  }, []);

  const handlePosterUpdate = (field: keyof Poster, value: string) => {
    setPosterValue(field, value);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Y.js 실시간 콜라보레이션</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}
          </span>
          <span className="user-count">👥 {connectedUsers}명 접속 중</span>
        </div>
      </header>

      <main className="app-main">
        <section className="content-section">
          <h2>📝 제목 & 부제목</h2>
          <div className="input-group">
            <label htmlFor="title">제목:</label>
            <input
              id="title"
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="제목을 입력하세요..."
              className="text-input"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="subtitle">부제목:</label>
            <input
              id="subtitle"
              type="text"
              value={subtitleValue}
              onChange={(e) => setSubtitleValue(e.target.value)}
              placeholder="부제목을 입력하세요..."
              className="text-input"
            />
          </div>
        </section>

        <section className="content-section">
          <h2>🖼️ 커버 포스터</h2>
          <div className="input-group">
            <label htmlFor="poster-url">포스터 URL:</label>
            <input
              id="poster-url"
              type="url"
              value={posterValue.url || ''}
              onChange={(e) => handlePosterUpdate('url', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="text-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="poster-alt">대체 텍스트:</label>
            <input
              id="poster-alt"
              type="text"
              value={posterValue.alt || ''}
              onChange={(e) => handlePosterUpdate('alt', e.target.value)}
              placeholder="이미지 설명..."
              className="text-input"
            />
          </div>
        </section>

        <section className="content-section">
          <h2>✍️ 본문 에디터</h2>
          <div className="editor-container">
            <div 
              ref={editorRef} 
              className="prosemirror-editor"
            />
            {!isReady && <p>에디터 로딩 중...</p>}
          </div>
        </section>

        <section className="preview-section">
          <h2>🔍 미리보기</h2>
          <div className="preview-content">
            {posterValue.url && (
              <div className="poster-preview">
                <img 
                  src={posterValue.url} 
                  alt={posterValue.alt || '커버 포스터'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <h1 className="preview-title">{titleValue || '제목 없음'}</h1>
            <h2 className="preview-subtitle">{subtitleValue || '부제목 없음'}</h2>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>💡 여러 탭에서 열어보면 실시간 동기화를 확인할 수 있습니다!</p>
      </footer>
    </div>
  );
}

export default App; 
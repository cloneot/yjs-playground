import { useState, useEffect } from 'react';
import * as Y from 'yjs';

// Y.Text를 React state와 연동하는 hook
export function useYText(ytext: Y.Text) {
  const [value, setValue] = useState(ytext.toString());

  useEffect(() => {
    const updateHandler = () => {
      setValue(ytext.toString());
    };

    // Y.Text 변경사항 구독
    ytext.observe(updateHandler);

    // 초기값 설정
    setValue(ytext.toString());

    return () => {
      ytext.unobserve(updateHandler);
    };
  }, [ytext]);

  const updateValue = (newValue: string) => {
    // 현재 내용을 모두 삭제하고 새 내용으로 교체
    ytext.delete(0, ytext.length);
    ytext.insert(0, newValue);
  };

  return [value, updateValue] as const;
}

// Y.Map을 React state와 연동하는 hook
export function useYMap<T = any>(ymap: Y.Map<T>) {
  const [value, setValue] = useState<Record<string, T>>({});

  useEffect(() => {
    const updateHandler = () => {
      const newValue: Record<string, T> = {};
      ymap.forEach((val, key) => {
        newValue[key] = val;
      });
      setValue(newValue);
    };

    // Y.Map 변경사항 구독
    ymap.observe(updateHandler);

    // 초기값 설정
    updateHandler();

    return () => {
      ymap.unobserve(updateHandler);
    };
  }, [ymap]);

  const updateValue = (key: string, newValue: T) => {
    ymap.set(key, newValue);
  };

  const deleteValue = (key: string) => {
    ymap.delete(key);
  };

  return [value, updateValue, deleteValue] as const;
} 
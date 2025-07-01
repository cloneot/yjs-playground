import { useState, useEffect } from 'react';
import * as Y from 'yjs';

// 공통 접두사 길이 찾기
const findCommonPrefix = (a: string, b: string): number => {
  const minLength = Math.min(a.length, b.length);
  let i = 0;
  while (i < minLength && a[i] === b[i]) i++;
  return i;
};

// 공통 접미사 길이 찾기
const findCommonSuffix = (a: string, b: string, prefixLength: number): number => {
  const maxSuffix = Math.min(a.length, b.length) - prefixLength;
  let i = 0;
  while (i < maxSuffix && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
};

// Diff 계산 및 적용
const applyTextDiff = (ytext: Y.Text, newValue: string) => {
  const currentValue = ytext.toString();
  
  if (currentValue === newValue) return;

  const prefixLength = findCommonPrefix(currentValue, newValue);
  const suffixLength = findCommonSuffix(currentValue, newValue, prefixLength);
  
  const deleteStart = prefixLength;
  const deleteLength = currentValue.length - prefixLength - suffixLength;
  const insertText = newValue.slice(prefixLength, newValue.length - suffixLength);
  
  // 삭제 후 삽입 순서로 적용
  deleteLength > 0 && ytext.delete(deleteStart, deleteLength);
  insertText.length > 0 && ytext.insert(deleteStart, insertText);
};

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

  const updateValue = (newValue: string) => applyTextDiff(ytext, newValue);

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
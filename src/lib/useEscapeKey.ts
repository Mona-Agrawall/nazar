import { useEffect, useRef } from 'react';

// Open layers (modals, popovers) in the order they were opened; Escape only closes the top one.
const layers: Array<{ current: () => void }> = [];

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || layers.length === 0) return;
  e.preventDefault();
  layers[layers.length - 1].current();
}

/** Calls `onEscape` when Escape is pressed while this layer is active and is the most recently opened one. */
export function useEscapeKey(onEscape: () => void, active = true) {
  const handlerRef = useRef(onEscape);

  useEffect(() => {
    handlerRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const layer = handlerRef;
    if (layers.length === 0) window.addEventListener('keydown', handleKeyDown);
    layers.push(layer);
    return () => {
      const index = layers.lastIndexOf(layer);
      if (index >= 0) layers.splice(index, 1);
      if (layers.length === 0) window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);
}

// Helpers de animación basados en anime.js v4.
// Uso en componentes:
//   const ref = useReveal();            // fade-up al montar
//   <div ref={ref}>…</div>
//   animateStagger(listRef.current, '.song-item');
import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade + slide-up de un elemento al montarse. */
export const fadeUp = (target, { duration = 550, delay = 0, distance = 18, ease = 'outCubic' } = {}) => {
  if (!target || !canAnimate()) return;
  animate(target, {
    opacity: [0, 1],
    translateY: [distance, 0],
    duration,
    delay,
    ease,
  });
};

/** Fade simple. */
export const fadeIn = (target, { duration = 450, delay = 0, ease = 'outQuad' } = {}) => {
  if (!target || !canAnimate()) return;
  animate(target, { opacity: [0, 1], duration, delay, ease });
};

/** Escala + fade (cards, modales). */
export const scaleIn = (target, { duration = 450, delay = 0, scale = 0.96, ease = 'outCubic' } = {}) => {
  if (!target || !canAnimate()) return;
  animate(target, {
    opacity: [0, 1],
    scale: [scale, 1],
    duration,
    delay,
    ease,
  });
};

/** Stagger sobre hijos de un contenedor (listas). */
export const staggerIn = (container, selector, { duration = 450, step = 55, distance = 14 } = {}) => {
  if (!container || !canAnimate()) return;
  const items = container.querySelectorAll(selector);
  if (!items.length) return;
  animate(items, {
    opacity: [0, 1],
    translateY: [distance, 0],
    duration,
    ease: 'outCubic',
    delay: stagger(step),
  });
};

/** Sacudida (errores en formularios). */
export const shake = (target, { duration = 450 } = {}) => {
  if (!target || !canAnimate()) return;
  animate(target, {
    translateX: [0, -9, 9, -7, 7, -4, 4, 0],
    duration,
    ease: 'inOutQuad',
  });
};

/** Pop suave (confirmaciones). */
export const pop = (target, { duration = 320, scale = 1.06 } = {}) => {
  if (!target || !canAnimate()) return;
  animate(target, {
    scale: [1, scale, 1],
    duration,
    ease: 'outQuad',
  });
};

/**
 * Hook: referencia cuyo contenido se anima (fade-up) al montar.
 * Vuelve a animar cuando `key` cambia.
 */
export const useReveal = (options) => {
  const ref = useRef(null);
  const key = options?.key;
  useEffect(() => {
    fadeUp(ref.current, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ref;
};

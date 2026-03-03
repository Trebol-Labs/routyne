import { animate } from 'animejs';
import { stagger } from 'animejs/utils';

/** Staggered fade-in for a list of elements */
export function staggerReveal(targets: string | HTMLElement[], delay = 60) {
  return animate(targets, {
    opacity: [0, 1],
    translateY: [20, 0],
    delay: stagger(delay),
    duration: 600,
    easing: 'easeOutExpo',
  });
}

/** Number counter animation */
export function animateNumber(target: HTMLElement, endValue: number, duration = 800) {
  const obj = { val: 0 };
  return animate(obj, {
    val: endValue,
    round: 1,
    duration,
    easing: 'easeOutExpo',
    onUpdate: () => {
      target.textContent = String(Math.round(obj.val));
    },
  });
}

/** Pulse glow effect on element */
export function pulseGlow(target: HTMLElement) {
  return animate(target, {
    boxShadow: [
      '0 0 0px rgba(59, 130, 246, 0)',
      '0 0 30px rgba(59, 130, 246, 0.4)',
      '0 0 0px rgba(59, 130, 246, 0)',
    ],
    duration: 1200,
    easing: 'easeInOutSine',
  });
}

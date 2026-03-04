/** Pulse glow effect on element using Web Animations API */
export function pulseGlow(target: HTMLElement): Animation {
  return target.animate(
    [
      { boxShadow: '0 0 0px rgba(59, 130, 246, 0)' },
      { boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)' },
      { boxShadow: '0 0 0px rgba(59, 130, 246, 0)' },
    ],
    { duration: 1200, easing: 'ease-in-out', fill: 'forwards' }
  );
}

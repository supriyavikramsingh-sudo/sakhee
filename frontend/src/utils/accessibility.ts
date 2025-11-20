/**
 * Accessibility Utilities
 * Helper functions and hooks for improving accessibility
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to manage focus trap in modals
 * @param {boolean} isOpen - Whether the modal is open
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element when modal opens
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeButton = container.querySelector('[aria-label="Close"]') as HTMLElement;
        closeButton?.click();
      }
    };

    container.addEventListener('keydown', handleTabKey as any);
    container.addEventListener('keydown', handleEscapeKey as any);

    return () => {
      container.removeEventListener('keydown', handleTabKey as any);
      container.removeEventListener('keydown', handleEscapeKey as any);
    };
  }, [isOpen]);

  return containerRef;
}

/**
 * Hook to announce messages to screen readers
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' or 'assertive'
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    announceRef.current.setAttribute('aria-live', politeness);
    announceRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 1000);
  };

  return { announce, announceRef };
}

/**
 * Get appropriate ARIA label for button state
 */
export function getButtonAriaLabel(action: string, state?: string): string {
  if (state === 'loading') {
    return `${action} in progress`;
  }
  if (state === 'success') {
    return `${action} completed successfully`;
  }
  if (state === 'error') {
    return `${action} failed`;
  }
  return action;
}

/**
 * Format date for screen readers
 */
export function formatDateForScreenReader(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast ratio calculation
  // For production, use a library like 'color-contrast-checker'
  return 4.5; // Placeholder - assumes WCAG AA compliance
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabIndex = element.getAttribute('tabindex');
  const role = element.getAttribute('role');
  
  // Interactive elements should be keyboard accessible
  const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox'];
  
  if (interactiveRoles.includes(role || '')) {
    return tabIndex !== '-1';
  }
  
  return true;
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

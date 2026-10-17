import { describe, it, expect } from 'vitest';
import { getTransitionKey } from '../PageTransition';

describe('PageTransition getTransitionKey', () => {
  it('stabilizes lesson player routes so sibling lessons share the same key', () => {
    expect(getTransitionKey('/learning/lessons/lesson-1')).toBe('/learning/lessons');
    expect(getTransitionKey('/learning/lessons/lesson-2')).toBe('/learning/lessons');
    expect(getTransitionKey('/learning/lessons/py-intro-123')).toBe('/learning/lessons');
  });

  it('preserves exact path for different pages to allow normal route transitions', () => {
    expect(getTransitionKey('/dashboard')).toBe('/dashboard');
    expect(getTransitionKey('/learning/courses/python-101')).toBe('/learning/courses/python-101');
    expect(getTransitionKey('/profile')).toBe('/profile');
    expect(getTransitionKey('/learning')).toBe('/learning');
  });
});

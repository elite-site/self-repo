/**
 * Scrolls `element` into view inside `container` by adjusting
 * `container.scrollTop` directly — never calls `scrollIntoView`, which would
 * scroll the entire page (AGENTS §ERR-9 / task requirement).
 *
 * The element is brought to the vertical centre of the visible scroll area.
 * Falls back to a no-op when either reference is null or the container has
 * no scrollable height.
 */
export function scrollWithin(
  container: HTMLElement | null,
  element: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
): void {
  if (!container || !element) return;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Offset of element top relative to container's scrollable content.
  const offsetTop =
    elementRect.top - containerRect.top + container.scrollTop;

  // Target scroll position: centre the element in the visible area.
  const targetScrollTop =
    offsetTop - container.clientHeight / 2 + elementRect.height / 2;

  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ top: targetScrollTop, behavior });
  } else {
    container.scrollTop = targetScrollTop;
  }
}

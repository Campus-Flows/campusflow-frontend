export const demoMode = new URLSearchParams(location.search).get('demo') === '1';

export function preserveModeLinks() {
  if (!demoMode) return;
  for (const link of document.querySelectorAll('[data-mode-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('demo', '1');
    link.href = url.href;
  }
  const notice = document.querySelector('#feature-demo-notice');
  if (notice) notice.hidden = false;
}

export function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function roomLink(building, room) {
  const link = node('a', building + ' · ' + room, 'room-link');
  const query = new URLSearchParams({ building, room });
  if (demoMode) query.set('demo', '1');
  link.href = './?' + query;
  return link;
}

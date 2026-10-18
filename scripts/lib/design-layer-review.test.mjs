import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewModel, scopeWords, overridesWithout } from '../../packages/design-layer/src/review.mjs';

const base = 'http://localhost:4340/dashboard';
const fb = (url, status) => ({ url, status, comment: 'x' });

test('Review lists changes and this page\'s comments, and counts changes plus open comments', () => {
  const m = reviewModel({
    notes: { a: { what: 'Size' }, b: { what: 'Color', check: 'Contrast 3.0:1' } },
    feedback: [fb('/dashboard', 'open'), fb('/dashboard', 'resolved'), fb('/projects', 'open')],
    page: '/dashboard', base,
  });
  assert.equal(m.changes.length, 2);
  assert.equal(m.changes[0][0], 'b', 'a failing change sorts first');
  assert.equal(m.open.length, 1, 'another page\'s comment is not listed');
  assert.equal(m.resolved.length, 1);
  assert.equal(m.count, 3, 'resolved comments do not count');
});

test('Review with nothing in it counts zero', () => {
  assert.equal(reviewModel({ feedback: [], page: '/', base }).count, 0);
});

test('scope words match the Applies To switch', () => {
  assert.equal(scopeWords({ kind: 'component' }, 11), 'Every (11)');
  assert.equal(scopeWords({ kind: 'instance' }, 1), 'Only this one');
});

test('Only This One reads from what Every made it, not from the source', () => {
  const every = { scope: 'component', selector: '.esa-card .esa-card__title' };
  const one = { scope: 'instance', selector: 'div > h3', page: '/dashboard' };
  // Reading Only This One keeps the Every rule (the defect: it used to drop every edit, so a Muted title read Default).
  assert.deepEqual(overridesWithout([every, one], { kind: 'instance', selector: 'div > h3', page: '/dashboard' }), [every]);
  // Reading Every drops its own rule and the one-element rules that would mask it.
  assert.deepEqual(overridesWithout([every, one], { kind: 'component', selector: '.esa-card .esa-card__title' }), []);
});

(function () {
var nav = document.querySelector('.nv');
if (!nav) return;
// Measure independent layout boxes, never feed their measured height back into their sizing.
var bar = nav.querySelector('.nv-bar'), strip = nav.querySelector('.nv-strip');
var measure = function () {
if (bar) document.documentElement.style.setProperty('--nav-h', Math.ceil(bar.getBoundingClientRect().height) + 'px');
if (strip) document.documentElement.style.setProperty('--strip-h', Math.ceil(strip.getBoundingClientRect().height) + 'px');
};
measure();
if ('ResizeObserver' in window) {
var sizes = new ResizeObserver(measure);
if (bar) sizes.observe(bar);
if (strip) sizes.observe(strip);
}
var menus = [].slice.call(nav.querySelectorAll('.nv-menu'));
var behind = function () { return [].slice.call(document.querySelectorAll('.sk-content, [data-callbar], [data-callbar-card]')); };
// The smooth scroll stops while an open menu locks the page, and starts again after it.
var held = false;
var hold = function () {
var lenis = window.__sitekit && window.__sitekit.lenis;
var lock = menus.some(function (d) { return d.open; }) && /hidden|clip/.test(getComputedStyle(document.documentElement).overflowY);
if (!lenis || lock === held) return;
held = lock;
if (lock) lenis.stop();
else if (!document.querySelector('[data-wizard-dialog][open]')) lenis.start();
};
menus.forEach(function (d) {
d.addEventListener('toggle', function () {
if (d.getAttribute('data-menu') === 'sheet') behind().forEach(function (el) { el.inert = d.open; });
hold();
});
d.addEventListener('click', function (e) { if (d.open && e.target.closest && e.target.closest('.nv-panel a')) d.open = false; });
});
// The smooth scroll loads on the first input, which can be the menu's own button: the wheel it would act on asks again.
nav.addEventListener('wheel', hold, { passive: true });
// A link with a menu under it.
var drops = [].slice.call(nav.querySelectorAll('[data-nv-drop]'));
var showing = function (d) { return d.hasAttribute('data-open') || (d.matches(':hover') && !d.hasAttribute('data-shut')); };
var tell = function (d) { var b = d.querySelector('.nv-drop-btn'); if (b) b.setAttribute('aria-expanded', String(showing(d))); };
// `hard` closes it under a resting pointer too.
var set = function (d, open, hard) {
d.toggleAttribute('data-open', open);
if (open || hard) d.toggleAttribute('data-shut', !open && d.matches(':hover'));
tell(d);
};
// Every menu but `keep` closes, also one a resting pointer holds open, and focus left inside goes to that menu's
// link: for the others when one opens (one menu at a time), and for all of them on Escape and the Back button.
var shut = function (keep) {
drops.forEach(function (d) {
var sub = d.querySelector('.nv-sub'), top = d.firstElementChild;
if (d === keep) return;
if (sub && top && sub.contains(document.activeElement)) top.focus({ preventScroll: true });
set(d, false, true);
});
};
var keyed = Boolean(window.CSS && CSS.supports && CSS.supports('selector(:focus-visible)'));
drops.forEach(function (d) {
var link = d.firstElementChild, btn = d.querySelector('.nv-drop-btn'), sub = d.querySelector('.nv-sub');
if (!link || !sub) return;
// The press that leads to a click: what pointer it was, and whether the menu was showing as it landed. A click
// with no press of its own (a key, a screen reader: its count is 0) reads the menu as it is now.
var press = null;
var down = function (e) { press = { mouse: e.pointerType === 'mouse', shown: showing(d) }; };
link.addEventListener('pointerdown', down);
link.addEventListener('click', function (e) {
var p = e.detail ? press : null;
press = null;
if (!p || p.mouse || p.shown) return;
e.preventDefault();
shut(d);
set(d, true);
});
if (btn) {
btn.disabled = false;
btn.addEventListener('pointerdown', down);
btn.addEventListener('click', function (e) {
var p = e.detail ? press : null;
press = null;
if (p && p.mouse) { d.removeAttribute('data-shut'); tell(d); return; }
if (p ? p.shown : showing(d)) set(d, false, true);
else { shut(d); set(d, true); }
});
}
// Focus that goes nowhere (a click on the page, another window) is not a move.
d.addEventListener('focusout', function (e) { if (e.relatedTarget && !d.contains(e.relatedTarget)) set(d, false); });
// Keyboard focus that walks into a panel a resting pointer opened holds it open: the pointer moving off must not
// hide the link in use. A mouse click's focus holds nothing.
sub.addEventListener('focusin', function (e) { if (keyed && e.target.matches(':focus-visible')) set(d, true); });
d.addEventListener('mouseenter', function () {
d.removeAttribute('data-shut');
shut(d);
if (sub.classList.contains('nv-sub-cols')) {
// The band runs from the link down to the panel. In a bar that has wrapped onto more rows, one of the bar's
// own controls can sit under the link: the strip stops above it, so that control can still be pressed.
var r = d.getBoundingClientRect(), to = parseFloat(getComputedStyle(sub).top), end = to;
[].forEach.call(nav.querySelectorAll('.nv-bar a, .nv-bar button, .nv-bar summary'), function (el) {
if (d.contains(el) || el.closest('.nv-sub, .nv-panel')) return;
var b = el.getBoundingClientRect();
if (b.width && b.right > r.left && b.left < r.right && b.bottom > r.bottom + 1 && b.top < end) end = Math.max(r.bottom, b.top);
});
d.style.setProperty('--nv-bridge', Math.max(0, end < to ? Math.floor(end - r.bottom) : Math.ceil(end - r.bottom)) + 'px');
}
tell(d);
});
d.addEventListener('mouseleave', function () { d.removeAttribute('data-shut'); tell(d); });
});
document.addEventListener('click', function (e) { drops.forEach(function (d) { if (!d.contains(e.target)) set(d, false); }); });
document.addEventListener('keydown', function (e) {
if (e.key !== 'Escape') return;
shut(null);
menus.forEach(function (d) { if (d.open) { d.open = false; d.querySelector('summary').focus(); } });
});
document.addEventListener('click', function (e) {
menus.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
});
// This runs before <main> is parsed, so the first section is looked up when it is needed.
var overlay = nav.hasAttribute('data-overlay'), first = null, queued = false;
var delayedActions = nav.getAttribute('data-actions') === 'after-hero';
var contacts = delayedActions ? [].slice.call(nav.querySelectorAll('[data-nav-contact]')) : [];
var heroEnd = null;
var tall = nav.getAttribute('data-overlay') === 'wide' && window.matchMedia ? window.matchMedia('(max-aspect-ratio: 4/5)') : null;
var update = function () {
queued = false;
nav.toggleAttribute('data-scrolled', window.scrollY > 40);
if (overlay && (first = first || document.querySelector('main > :first-child [data-overlay-end]') || document.querySelector('main > :first-child'))) nav.toggleAttribute('data-solid', Boolean(tall && tall.matches) || first.getBoundingClientRect().bottom <= nav.offsetHeight);
if (delayedActions) {
heroEnd = heroEnd || document.querySelector('[data-callbar-hero-end]') || document.querySelector('main > :first-child');
var shown = Boolean(heroEnd && heroEnd.getBoundingClientRect().bottom <= Math.max(0, nav.getBoundingClientRect().bottom));
nav.setAttribute('data-actions-state', shown ? 'on' : 'off');
contacts.forEach(function (el) { el.inert = !shown; el.setAttribute('aria-hidden', shown ? 'false' : 'true'); });
}
};
window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
window.addEventListener('resize', function () {
menus.forEach(function (d) { if (d.open && !d.getClientRects().length) d.open = false; });
update();
});
window.addEventListener('pageshow', function (e) { if (e.persisted) shut(null); update(); });
update();
document.addEventListener('DOMContentLoaded', function () {
update();
if (delayedActions && 'ResizeObserver' in window) {
var observer = new ResizeObserver(update);
observer.observe(nav);
if (heroEnd) observer.observe(heroEnd);
}
});
})();
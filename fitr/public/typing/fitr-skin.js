/* Fitrah Tribune additions to Monkeytype (loaded by monkeytype.html).
 *
 * 1. Before Monkeytype starts: fix the test to 30 seconds of plain
 *    English, the only test the Student Challenge counts, and set the
 *    Tribune's colours. Everything else
 *    the reader set (caret, sounds, tape mode, …) is kept.
 * 2. When a test ends: tell the Tribune page around this frame the result.
 * 3. Hide the "Account settings have moved" box on the settings page
 *    (there are no Monkeytype accounts here). It has no name of its own
 *    to hide it by in CSS, so it is found by its words.
 */
(function () {
  try {
    var cfg = JSON.parse(localStorage.getItem('config') || '{}');
    Object.assign(cfg, {
      mode: 'time', time: 30, language: 'english', punctuation: false, numbers: false,
      funbox: [], lazyMode: false, britishEnglish: false,
      // The Tribune's colours, as Monkeytype's own custom theme so the
      // result chart and everything else it draws match the site:
      // paper, gold, navy caret, muted ink, deep paper, ink, errors.
      customTheme: true, randomTheme: 'off', autoSwitchTheme: false,
      customThemeColors: ['#f5ecdb', '#c08e3a', '#1c3658', '#877f6e', '#ebdfc4',
        '#1a1814', '#b2422e', '#8a3323', '#b2422e', '#8a3323'],
      customBackground: '', colorfulMode: false, flipTestColors: false
    });
    localStorage.setItem('config', JSON.stringify(cfg));
  } catch (e) { /* storage blocked: Monkeytype uses its defaults, which are the same test */ }
})();

(function () {
  var sent = null;
  function shown(sel) { var el = document.querySelector(sel); return el ? (el.textContent || '').trim() : ''; }
  function label(sel) { var el = document.querySelector(sel); return el ? (el.getAttribute('aria-label') || '').trim() : ''; }
  function check() {
    var box = document.getElementById('result');
    if (!box || box.classList.contains('hidden')) { sent = null; return; }
    var wpm = shown('#result .stats .wpm .bottom'), acc = shown('#result .stats .acc .bottom');
    var raw = shown('#result .morestats .raw .bottom'), type = shown('#result .morestats .testType .bottom');
    if (!wpm || wpm === '-' || !acc || acc === '-') return;
    var key = [wpm, acc, raw, type].join('|');
    if (key === sent) return;
    sent = key;
    window.parent.postMessage({ type: 'fitr-typing-result', wpm: wpm, acc: acc, raw: raw, testType: type,
      exactWpm: label('#result .stats .wpm .bottom') || wpm }, location.origin);
  }
  function tidy() {
    var page = document.querySelector('.pageSettings.active');
    if (!page) return;
    var all = page.querySelectorAll('div:not(.fitr-hide)');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.parentElement && el.parentElement.matches('.grid.gap-8') &&
          /^\s*Account settings have moved/.test(el.textContent || '')) el.classList.add('fitr-hide');
    }
  }
  function start() {
    new MutationObserver(function () { setTimeout(check, 300); tidy(); })
      .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

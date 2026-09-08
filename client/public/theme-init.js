// Applies the saved theme before first paint (external file so a strict CSP without 'unsafe-inline' scripts works).
(function () {
  try {
    var t = localStorage.getItem('ip_theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (t !== 'light' && sys)) document.documentElement.classList.add('dark');
  } catch (e) { /* storage unavailable */ }
})();

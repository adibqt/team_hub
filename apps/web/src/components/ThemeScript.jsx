// Runs synchronously in <head> before React hydrates so the first paint
// matches the user's persisted preference (or the OS default). Without
// this we'd flash light theme to dark-mode users every navigation.
const SCRIPT = `
(function () {
  try {
    var stored = null;
    try { stored = localStorage.getItem('th:theme'); } catch (e) {}
    var pref = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;
    var root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

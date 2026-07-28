// Runs before paint (inline, not a normal client component) to add `dark` to <html> before
// React hydrates — avoids a flash of the wrong theme on load. Reads localStorage first; falls
// back to the OS-level prefers-color-scheme if the user hasn't chosen yet. Kept as a tiny
// standalone script rather than a React effect specifically so it can run synchronously in
// <head>, ahead of first paint — see ThemeToggle.tsx for the interactive light/dark switch.
export default function ThemeInit() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem("harvestos-theme");
        var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (dark) document.documentElement.classList.add("dark");
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

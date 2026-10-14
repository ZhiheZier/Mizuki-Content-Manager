const toggle = document.getElementById("themeToggle") as HTMLButtonElement;
function updateThemeButton() {
  const dark = document.documentElement.classList.contains("dark");
  const label = dark ? "切换浅色模式" : "切换深色模式";
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
}
updateThemeButton();
toggle.addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark");
  try { localStorage.setItem("mcm-theme", dark ? "dark" : "light"); } catch {}
  updateThemeButton();
});
const appearanceButton = document.getElementById("appearanceToggle") as HTMLButtonElement;
const panel = document.getElementById("appearancePanel")!;
const hueInput = document.getElementById("themeHue") as HTMLInputElement;
const swatches = Array.from(document.querySelectorAll<HTMLButtonElement>(".hue-preset"));
function updateHue(value: string) {
  document.documentElement.style.setProperty("--hue", value);
  swatches.forEach((swatch) => swatch.setAttribute("aria-pressed", String(swatch.dataset.hue === value)));
}
hueInput.value = getComputedStyle(document.documentElement).getPropertyValue("--hue").trim();
updateHue(hueInput.value);
function setPanel(open: boolean) {
  panel.hidden = !open;
  appearanceButton.setAttribute("aria-expanded", String(open));
}
appearanceButton.addEventListener("click", () => setPanel(panel.hidden));
hueInput.addEventListener("input", () => {
  updateHue(hueInput.value);
  try { localStorage.setItem("mcm-hue", hueInput.value); } catch {}
});
swatches.forEach((swatch) => swatch.addEventListener("click", () => {
  hueInput.value = swatch.dataset.hue!;
  updateHue(hueInput.value);
  try { localStorage.setItem("mcm-hue", hueInput.value); } catch {}
}));
document.addEventListener("click", (event) => {
  if (event.target instanceof Node && !panel.contains(event.target) && !appearanceButton.contains(event.target)) setPanel(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) { setPanel(false); appearanceButton.focus(); }
});

// The launcher owns its navigation state while applying or starting a project.
if (document.body.dataset.page !== "launcher") {
  const blogButton = document.getElementById("blogEditor") as HTMLButtonElement;
  let session: { codeRoot: string; previewUrl: string } | null = null;
  let checking = false;
  async function refreshSession() {
    if (checking) return;
    checking = true;
    try {
      const configResponse = await fetch("/api/config");
      if (!configResponse.ok) throw new Error("配置读取失败");
      const { config } = await configResponse.json();
      let cached: { codeRoot?: string; previewUrl?: string } | null = null;
      try { cached = JSON.parse(sessionStorage.getItem("mcm-workspace") || "null"); } catch {}
      const codeRoot = config.codeRoot;
      if (!codeRoot) { session = null; blogButton.disabled = true; return; }
      const response = await fetch("/api/preview/status", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({project: {codeRoot}, previewUrl: cached?.codeRoot === codeRoot ? cached?.previewUrl : ""}) });
      if (!response.ok) throw new Error("状态读取失败");
      const state = await response.json();
      session = state.ready && state.previewUrl ? {codeRoot, previewUrl: state.previewUrl} : null;
      blogButton.disabled = !session;
      if (session) sessionStorage.setItem("mcm-workspace", JSON.stringify(session));
    } catch { session = null; blogButton.disabled = true; }
    finally { checking = false; }
  }
  blogButton.addEventListener("click", async () => {
    if (document.body.dataset.page === "workspace") return;
    await refreshSession();
    if (session) window.location.assign("/workspace");
  });
  void refreshSession();
  window.setInterval(() => { if (!document.hidden) void refreshSession(); }, 10000);
}

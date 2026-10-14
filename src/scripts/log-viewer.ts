const logDate = document.getElementById("logDate") as HTMLInputElement;
const follow = document.getElementById("followLog") as HTMLInputElement;
const contentView = document.getElementById("logContent")!;
const logStatus = document.getElementById("logStatus")!;
const refreshButton = document.getElementById("refreshLogs") as HTMLButtonElement;
let loading = false;
let viewVersion = 0;

async function refreshLogs() {
  if (loading) return;
  loading = true;
  refreshButton.disabled = true;
  const version = viewVersion;
  try {
    const query = logDate.value ? `?date=${encodeURIComponent(logDate.value)}` : "";
    const response = await fetch(`/api/logs${query}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "日志读取失败");
    if (version !== viewVersion) return;
    logDate.value = data.date;
    if (data.dates.length) {
      logDate.min = data.dates[data.dates.length - 1];
      logDate.max = data.dates[0];
    }
    const content = data.content || "该日期暂无日志。";
    if (contentView.textContent !== content) {
      const scrollTop = contentView.scrollTop;
      contentView.textContent = content;
      contentView.scrollTop = follow.checked ? contentView.scrollHeight : scrollTop;
    }
    logStatus.textContent = `${data.date} · 已更新 ${new Date().toLocaleTimeString("zh-CN", {hour12:false})}`;
  } catch (error) { logStatus.textContent = error instanceof Error ? error.message : String(error); }
  finally { loading = false; refreshButton.disabled = false; }
}
refreshButton.addEventListener("click", () => void refreshLogs());
logDate.addEventListener("change", () => {
  viewVersion++;
  void refreshLogs();
});
follow.addEventListener("change", () => { if (follow.checked) contentView.scrollTop = contentView.scrollHeight; });
void refreshLogs();
window.setInterval(() => { if (!document.hidden) void refreshLogs(); }, 3000);

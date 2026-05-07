function applyStoredTheme(): void {
  if (localStorage.getItem("link-shortener-theme") === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function qooxdooMain(app: qx.application.Standalone) {
  applyStoredTheme();

  const params = new URLSearchParams(window.location.search);
  const slugParam = params.get("go");
  if (slugParam) {
    const slug = slugParam.trim();
    const target = LinkStore.getTarget(slug);
    if (target) {
      window.location.replace(target);
      return;
    }
    qx.event.Timer.once(() => {
      BsToast.error("Link not found", "No saved URL for this code on this device.");
      const clean = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, "", clean);
    }, null, 400);
  }

  const root = <qx.ui.container.Composite>app.getRoot();
  root.removeAll();
  root.add(new ShortenerPage(), { edge: 0 });
}

qx.registry.registerMainMethod(qooxdooMain);

type LinkEntry = {
  targetUrl: string;
  createdAt: number;
  /** When set (e.g. API shorten), copy/share uses this instead of local ?go= URL */
  shortUrl?: string;
};

const STORAGE_KEY = "link-shortener-v1";
const THEME_STORAGE_KEY = "link-shortener-theme";
const PAGE_H_PADDING = 16;
const RECENT_LIMIT = 10;

class LinkStore {
  static load(): Record<string, LinkEntry> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, LinkEntry>)
        : {};
    } catch {
      return {};
    }
  }

  static save(map: Record<string, LinkEntry>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  static getTarget(slug: string): string | null {
    const e = this.load()[slug];
    return e?.targetUrl ?? null;
  }

  static hasSlug(slug: string): boolean {
    return slug in this.load();
  }

  static put(slug: string, targetUrl: string, shortUrl?: string): void {
    const map = this.load();
    const next: LinkEntry = {
      targetUrl,
      createdAt: Date.now(),
    };
    if (shortUrl !== undefined) next.shortUrl = shortUrl;
    map[slug] = next;
    this.save(map);
  }

  static remove(slug: string): void {
    const map = this.load();
    if (!(slug in map)) return;
    delete map[slug];
    this.save(map);
  }

  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static listRecent(limit: number): { slug: string; entry: LinkEntry }[] {
    const map = this.load();
    const keys = Object.keys(map);
    const rows: { slug: string; entry: LinkEntry }[] = [];
    for (let i = 0; i < keys.length; i++) {
      const slug = keys[i];
      rows.push({ slug, entry: map[slug] });
    }
    return rows.sort((a, b) => b.entry.createdAt - a.entry.createdAt).slice(0, limit);
  }
}

function normalizeTargetUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    try {
      const u = new URL("https://" + t);
      if (u.hostname.length > 0) return u.href;
    } catch {
      return null;
    }
  }
  return null;
}

function randomSlug(len = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

function sanitizeCustomSlug(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!s) return null;
  if (s.length > 64) return null;
  if (s === "go") return null;
  return s;
}

function __isIpv4Host(hostname: string): boolean {
  return /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(
    hostname,
  );
}

function getDisplayedShortLinkBase(): string {
  const meta = document.querySelector('meta[name="shortener-base"]');
  const raw = meta?.getAttribute("content")?.trim();
  if (raw) {
    return raw.replace(/\/$/, "") + window.location.pathname;
  }

  const { protocol, hostname, port, pathname } = window.location;
  const host =
    __isIpv4Host(hostname) || hostname === "0.0.0.0"
      ? "localhost"
      : hostname;
  const portPart =
    port && !((protocol === "http:" && port === "80") || (protocol === "https:" && port === "443"))
      ? ":" + port
      : "";
  return `${protocol}//${host}${portPart}${pathname}`;
}

function buildLocalGoShortUrl(slug: string): string {
  const base = getDisplayedShortLinkBase();
  return `${base}${base.indexOf("?") >= 0 ? "&" : "?"}go=${encodeURIComponent(slug)}`;
}

function getShortenerApiBase(): string | null {
  const meta = document.querySelector('meta[name="shortener-api"]');
  const raw = meta?.getAttribute("content")?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function __execCommandCopyNow(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "0";
  ta.style.top = "0";
  ta.style.width = "1px";
  ta.style.height = "1px";
  ta.style.margin = "0";
  ta.style.padding = "0";
  ta.style.border = "0";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  ta.focus({ preventScroll: true });
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  return ok;
}

function copyTextToClipboard(text: string): Promise<void> {
  if (__execCommandCopyNow(text)) {
    return Promise.resolve();
  }
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("copy"));
}

function bindInputEnter(bsInput: BsInput, onEnter: () => void): void {
  const wire = () => {
    const dom = bsInput.getContentElement().getDomElement();
    const input = dom?.querySelector("input");
    if (!input) return;
    input.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        onEnter();
      }
    });
  };
  bsInput.addListenerOnce("appear", () => {
    wire();
    qx.event.Timer.once(wire, null, 80);
  });
}

function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const keep = maxLen - 3;
  const a = Math.ceil(keep / 2);
  const b = Math.floor(keep / 2);
  return s.slice(0, a) + "..." + s.slice(s.length - b);
}

class ShortenerPage extends qx.ui.container.Composite {
  private __longUrl: BsInput;
  private __customSlug: BsInput;
  private __shortUrlLabel: qx.ui.basic.Label;
  private __shortenBtn: BsButton;
  private __themeBtn: BsButton;
  private __lastShortUrl = "";
  private __lastQrDataUrl = "";
  private __qrHost: qx.ui.embed.Html;
  private __qrPopup: qx.ui.popup.Popup;
  private __qrPopupImg: qx.ui.embed.Html;
  private __recentBody: qx.ui.container.Composite;

  constructor() {
    super();
    this.setLayout(new qx.ui.layout.Grow());
    this.setBackgroundColor(AppColors.background());

    /** Uses native overflow; `qx.ui.container.Scroll` has no `setLayout` (AbstractScrollArea). */
    const scrollHost = new qx.ui.container.Composite(new qx.ui.layout.Grow());
    scrollHost.getContentElement().setStyles({
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    } as unknown as Record<string, string>);

    const column = new qx.ui.container.Composite(
      new qx.ui.layout.VBox(16).set({ alignX: "center", alignY: "top" }),
    );
    column.setPadding(PAGE_H_PADDING);

    const topBar = new qx.ui.container.Composite(
      new qx.ui.layout.HBox(8).set({ alignY: "middle" }),
    );
    topBar.setAllowGrowX(true);
    const themeSlot = new qx.ui.container.Composite(
      new qx.ui.layout.HBox().set({ alignX: "center", alignY: "middle" }),
    );
    themeSlot.setMinWidth(124);
    themeSlot.setMaxWidth(124);
    this.__themeBtn = new BsButton(this.__themeButtonLabel(), undefined, {
      variant: "ghost",
      size: "sm",
    });
    this.__themeBtn.setAllowGrowX(true);
    this.__themeBtn.onClick(() => this.__toggleTheme());
    themeSlot.add(this.__themeBtn);
    topBar.add(new qx.ui.core.Spacer(), { flex: 1 });
    topBar.add(themeSlot);

    const card = new BsCard();
    const inner = new qx.ui.container.Composite(
      new qx.ui.layout.VBox(12).set({ alignX: "stretch" }),
    );
    inner.setMaxWidth(520);

    const heading = new qx.ui.basic.Label("Shorten a link");
    heading.setTextColor(AppColors.foreground());
    heading.setFont(
      // @ts-ignore qooxdoo Font
      new qx.bom.Font(22).set({ bold: true }),
    );

    const apiBase = getShortenerApiBase();
    const hint = new qx.ui.basic.Label(
      apiBase
        ? "Using API server for short links (see shortener-api meta). Local ?go= links still work when saved here."
        : "Links are stored in this browser only. Short URLs use the ?go= code on this page.",
    );
    hint.setTextColor(AppColors.mutedForeground());
    hint.setRich(true);
    hint.setWrap(true);
    hint.setMaxWidth(520);

    this.__longUrl = new BsInput("", "https://example.com/very/long/path", "w-full");
    this.__customSlug = new BsInput("", "Optional custom code (letters, numbers, dash)", "w-full");

    bindInputEnter(this.__longUrl, () => this.__shorten());
    bindInputEnter(this.__customSlug, () => this.__shorten());

    this.__shortenBtn = new BsButton("Shorten", undefined, { variant: "default" });
    this.__shortenBtn.setAllowGrowX(true);
    this.__shortenBtn.setMinHeight(44);
    this.__shortenBtn.onClick(() => this.__shorten());

    const outHeading = new qx.ui.basic.Label("Your short URL");
    outHeading.setTextColor(AppColors.mutedForeground());
    outHeading.setMarginTop(8);

    this.__shortUrlLabel = new qx.ui.basic.Label("—");
    this.__shortUrlLabel.setTextColor(AppColors.foreground());
    this.__shortUrlLabel.setSelectable(true);
    this.__shortUrlLabel.setWrap(true);

    this.__qrHost = new qx.ui.embed.Html(this.__mainQrPlaceholderHtml());
    this.__qrHost.setMinWidth(168);
    this.__qrHost.setWidth(168);
    this.__qrHost.setMinHeight(168);
    this.__qrHost.setHeight(168);
    this.__qrHost.setAllowShrinkX(false);
    this.__qrHost.setAllowShrinkY(false);
    this.__qrHost.exclude();

    const copyRow = new qx.ui.container.Composite(
      new qx.ui.layout.HBox(8).set({ alignY: "middle" }),
    );
    copyRow.setAllowGrowX(true);
    const copyBtn = new BsButton("Copy", undefined, { variant: "outline" });
    copyBtn.setAllowGrowX(true);
    copyBtn.setMinHeight(44);
    copyBtn.onClick(() => this.__copyShortUrl());
    const openBtn = new BsButton("Open", undefined, { variant: "outline" });
    openBtn.setAllowGrowX(true);
    openBtn.setMinHeight(44);
    openBtn.onClick(() => this.__openShortUrl());
    const saveQrBtn = new BsButton("Save QR", undefined, { variant: "outline" });
    saveQrBtn.setAllowGrowX(true);
    saveQrBtn.setMinHeight(44);
    saveQrBtn.onClick(() => this.__saveQrPng());
    copyRow.add(copyBtn, { flex: 1 });
    copyRow.add(openBtn, { flex: 1 });
    copyRow.add(saveQrBtn, { flex: 1 });

    inner.add(heading);
    inner.add(hint);
    inner.add(this.__longUrl);
    inner.add(this.__customSlug);
    inner.add(this.__shortenBtn);
    const outRow = new qx.ui.container.Composite(
      new qx.ui.layout.HBox(10).set({ alignY: "top" }),
    );
    outRow.setAllowGrowX(true);
    const urlCol = new qx.ui.container.Composite(
      new qx.ui.layout.VBox(6).set({ alignX: "stretch" }),
    );
    urlCol.setAllowGrowX(true);
    urlCol.add(outHeading);
    urlCol.add(this.__shortUrlLabel);
    outRow.add(urlCol, { flex: 1 });
    outRow.add(this.__qrHost);
    inner.add(outRow);
    inner.add(copyRow);

    card.setContent(inner);

    const recentCard = new BsCard();
    const recentInner = new qx.ui.container.Composite(
      new qx.ui.layout.VBox(10).set({ alignX: "stretch" }),
    );
    recentInner.setMaxWidth(520);
    const recentTitle = new qx.ui.basic.Label("Recent");
    recentTitle.setTextColor(AppColors.foreground());
    recentTitle.setFont(
      // @ts-ignore
      new qx.bom.Font(16).set({ bold: true }),
    );
    const clearRecentBtn = new BsButton("Clear history", undefined, {
      variant: "outline",
      size: "sm",
    });
    clearRecentBtn.onClick(() => this.__clearRecent());
    const recentHeader = new qx.ui.container.Composite(
      new qx.ui.layout.HBox(8).set({ alignY: "middle" }),
    );
    recentHeader.add(recentTitle, { flex: 1 });
    recentHeader.add(clearRecentBtn);
    this.__recentBody = new qx.ui.container.Composite(
      new qx.ui.layout.VBox(8).set({ alignX: "stretch" }),
    );
    recentInner.add(recentHeader);
    recentInner.add(this.__recentBody);
    recentCard.setContent(recentInner);

    column.add(topBar);
    column.add(card);
    column.add(recentCard);
    scrollHost.add(column, { edge: 0 });
    this.add(scrollHost, { flex: 1 });

    const syncWidths = () => {
      const vw = qx.bom.Viewport.getWidth();
      const avail = Math.max(0, vw - PAGE_H_PADDING * 2);
      const width = Math.min(520, Math.max(200, avail));
      const innerMin = Math.min(280, Math.max(200, avail));
      topBar.setMinWidth(innerMin);
      topBar.setWidth(width);
      inner.setMinWidth(innerMin);
      inner.setWidth(width);
      recentInner.setMinWidth(innerMin);
      recentInner.setWidth(width);
    };
    qx.event.Registration.addListener(window, "resize", syncWidths);
    syncWidths();

    const popupLayout = new qx.ui.layout.VBox(12).set({ alignX: "center" });
    this.__qrPopup = new qx.ui.popup.Popup(popupLayout);
    this.__qrPopup.setPadding(16);
    this.__qrPopup.setAutoHide(true);
    this.__qrPopup.setBackgroundColor(AppColors.card());
    const qrPopupTitle = new qx.ui.basic.Label("QR code");
    qrPopupTitle.setTextColor(AppColors.foreground());
    qrPopupTitle.setFont(
      // @ts-ignore qooxdoo Font
      new qx.bom.Font(16).set({ bold: true }),
    );
    this.__qrPopupImg = new qx.ui.embed.Html(
      `<p class="text-center text-sm" style="color:var(--color-muted-foreground)">Loading…</p>`,
    );
    const qrPopupClose = new BsButton("Close", undefined, { variant: "outline" });
    qrPopupClose.onClick(() => this.__qrPopup.hide());
    this.__qrPopup.add(qrPopupTitle);
    this.__qrPopup.add(this.__qrPopupImg);
    this.__qrPopup.add(qrPopupClose);

    this.__renderRecent();
  }

  private __mainQrPlaceholderHtml(): string {
    return `<div class="flex items-center justify-center rounded-lg border bg-white" style="width:100%;height:100%"><p class="text-center text-xs px-2" style="color: var(--color-muted-foreground)">Generate link</p></div>`;
  }

  private __refreshMainQr(shortUrl: string): void {
    generateQrDataUrl(shortUrl, 160).then(
      (dataUrl) => {
        this.__lastQrDataUrl = dataUrl;
        this.__qrHost.show();
        this.__qrHost.setHtml(
          `<div class="flex justify-center rounded-lg bg-white p-1" style="width:100%;height:100%"><img src="${dataUrl}" width="160" height="160" alt="QR code for shortened link" /></div>`,
        );
      },
      () => {
        this.__lastQrDataUrl = "";
        this.__qrHost.setHtml(this.__mainQrPlaceholderHtml());
        this.__qrHost.exclude();
        BsToast.error(
          "QR unavailable",
          "Could not generate QR code. Ensure resource/vendor/qrcode.min.js is loaded.",
        );
      },
    );
  }

  private __clearMainQr(): void {
    this.__lastQrDataUrl = "";
    this.__qrHost.setHtml(this.__mainQrPlaceholderHtml());
    this.__qrHost.exclude();
  }

  private __saveQrPng(): void {
    if (!this.__lastQrDataUrl) {
      BsToast.warning("Nothing to save", "Shorten a link first.");
      return;
    }
    const a = document.createElement("a");
    a.href = this.__lastQrDataUrl;
    a.download = "short-link.png";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    BsToast.success("Saved", "short-link.png");
  }

  private __showRecentQrPopup(shortUrl: string): void {
    this.__qrPopupImg.setHtml(
      `<p class="text-center text-sm" style="color:var(--color-muted-foreground)">Loading…</p>`,
    );
    generateQrDataUrl(shortUrl, 280).then(
      (dataUrl) => {
        this.__qrPopupImg.setHtml(
          `<div class="flex justify-center rounded-lg bg-white p-2"><img src="${dataUrl}" width="280" height="280" alt="QR code for shortened link" /></div>`,
        );
        this.__qrPopup.show();
        qx.event.Timer.once(() => this.__centerQrPopup(), this, 50);
      },
      () => {
        BsToast.error(
          "QR unavailable",
          "Could not generate QR code. Ensure resource/vendor/qrcode.min.js is loaded.",
        );
      },
    );
  }

  private __centerQrPopup(): void {
    const vw = qx.bom.Viewport.getWidth();
    const vh = qx.bom.Viewport.getHeight();
    const b = this.__qrPopup.getBounds();
    if (!b) return;
    const left = Math.max(12, Math.floor((vw - b.width) / 2));
    const top = Math.max(12, Math.floor((vh - b.height) / 2));
    this.__qrPopup.moveTo(left, top);
  }

  private __historyQrHtml(shortUrl: string): qx.ui.embed.Html {
    const host = new qx.ui.embed.Html(
      `<div class="rounded-md border bg-white" style="width:100%;height:100%"></div>`,
    );
    host.setMinWidth(72);
    host.setWidth(72);
    host.setMinHeight(72);
    host.setHeight(72);
    host.setAllowShrinkX(false);
    host.setAllowShrinkY(false);
    generateQrDataUrl(shortUrl, 68).then(
      (dataUrl) => {
        host.setHtml(
          `<div class="rounded-md border bg-white p-0.5" style="width:100%;height:100%"><img src="${dataUrl}" width="68" height="68" alt="QR code for history link" /></div>`,
        );
      },
      () => {
        host.setHtml(
          `<div class="rounded-md border bg-white flex items-center justify-center" style="width:100%;height:100%"><span class="text-[10px]" style="color:var(--color-muted-foreground)">QR</span></div>`,
        );
      },
    );
    return host;
  }

  private __themeButtonLabel(): string {
    return document.documentElement.classList.contains("dark")
      ? "Light mode"
      : "Dark mode";
  }

  private __toggleTheme(): void {
    const rootEl = document.documentElement;
    if (rootEl.classList.contains("dark")) {
      rootEl.classList.remove("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    } else {
      rootEl.classList.add("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
    }
    this.__themeBtn.setLabelText(this.__themeButtonLabel());
  }

  private __shorten(): void {
    this.__shortenBtn.setEnabled(false);
    const api = getShortenerApiBase();
    if (api) {
      this.__shortenWithApi(api).then(
        () => undefined,
        () => undefined,
      ).then(() => {
        this.__shortenBtn.setEnabled(true);
      });
      return;
    }
    try {
      this.__shortenLocal();
      this.__renderRecent();
    } finally {
      this.__shortenBtn.setEnabled(true);
    }
  }

  private __shortenLocal(): void {
    const raw = this.__longUrl.getValue();
    const target = normalizeTargetUrl(raw);
    if (!target) {
      BsToast.error("Invalid URL", "Enter a valid http(s) URL.");
      return;
    }

    const customRaw = this.__customSlug.getValue();
    let slug: string;
    if (customRaw.trim()) {
      const c = sanitizeCustomSlug(customRaw);
      if (!c) {
        BsToast.error("Invalid custom code", "Use letters, numbers, or dashes. Reserved codes are not allowed.");
        return;
      }
      if (LinkStore.hasSlug(c)) {
        BsToast.error("Code already used", "Pick another custom code.");
        return;
      }
      slug = c;
    } else {
      let candidate = randomSlug();
      let guard = 0;
      while (LinkStore.hasSlug(candidate) && guard++ < 50) {
        candidate = randomSlug();
      }
      if (LinkStore.hasSlug(candidate)) {
        BsToast.error("Try again", "Could not allocate a unique code.");
        return;
      }
      slug = candidate;
    }

    LinkStore.put(slug, target);
    const shortUrl = buildLocalGoShortUrl(slug);
    this.__lastShortUrl = shortUrl;
    this.__shortUrlLabel.setValue(shortUrl);
    this.__refreshMainQr(shortUrl);
    BsToast.success("Link saved", "Open the short URL in this browser to redirect.");
  }

  private __shortenWithApi(api: string): Promise<void> {
    const raw = this.__longUrl.getValue();
    const target = normalizeTargetUrl(raw);
    if (!target) {
      BsToast.error("Invalid URL", "Enter a valid http(s) URL.");
      return Promise.resolve();
    }
    const customRaw = this.__customSlug.getValue().trim();
    const slugOpt = customRaw ? sanitizeCustomSlug(customRaw) : undefined;
    if (customRaw && !slugOpt) {
      BsToast.error("Invalid custom code", "Use letters, numbers, or dashes.");
      return Promise.resolve();
    }
    const body: { targetUrl: string; slug?: string } = { targetUrl: target };
    if (slugOpt) body.slug = slugOpt;

    return fetch(`${api}/api/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return Promise.reject(new Error(String(r.status)));
        return r.json() as Promise<{ slug: string }>;
      })
      .then((data) => {
        const shortUrl = `${api}/${encodeURIComponent(data.slug)}`;
        LinkStore.put(data.slug, target, shortUrl);
        this.__lastShortUrl = shortUrl;
        this.__shortUrlLabel.setValue(shortUrl);
        this.__refreshMainQr(shortUrl);
        BsToast.success("Link saved", shortUrl);
        this.__renderRecent();
      })
      .catch(() => {
        BsToast.error("API error", "Run npm run server:api and set shortener-api meta URL.");
      });
  }

  private __copyShortUrl(): void {
    if (!this.__lastShortUrl) {
      BsToast.warning("Nothing to copy", "Shorten a link first.");
      return;
    }
    const text = this.__lastShortUrl;
    copyTextToClipboard(text).then(
      () => BsToast.success("Copied", text),
      () =>
        BsToast.error("Copy failed", "Select the link and press Ctrl+C, or use HTTPS/localhost."),
    );
  }

  private __openShortUrl(): void {
    if (!this.__lastShortUrl) {
      BsToast.warning("Nothing to open", "Shorten a link first.");
      return;
    }
    window.location.assign(this.__lastShortUrl);
  }

  private __copyUrlText(text: string): void {
    copyTextToClipboard(text).then(
      () => BsToast.success("Copied", truncateMiddle(text, 48)),
      () => BsToast.error("Copy failed", ""),
    );
  }

  private __clearRecent(): void {
    LinkStore.clearAll();
    this.__renderRecent();
    this.__lastShortUrl = "";
    this.__shortUrlLabel.setValue("—");
    this.__clearMainQr();
    BsToast.info("Cleared", "All saved short links were removed from this browser.");
  }

  private __renderRecent(): void {
    this.__recentBody.removeAll();
    const rows = LinkStore.listRecent(RECENT_LIMIT);
    if (rows.length === 0) {
      const empty = new qx.ui.basic.Label("No saved links yet.");
      empty.setTextColor(AppColors.mutedForeground());
      this.__recentBody.add(empty);
      return;
    }
    for (const { slug, entry } of rows) {
      const shortUrl = entry.shortUrl ?? buildLocalGoShortUrl(slug);
      const row = new qx.ui.container.Composite(
        new qx.ui.layout.VBox(4).set({ alignX: "stretch" }),
      );
      row.setPadding(8, 0, 8, 0);
      row.setDecorator(
        new qx.ui.decoration.Decorator().set({
          widthBottom: 1,
          styleBottom: "solid",
          colorBottom: AppColors.border(),
        }),
      );
      const line1 = new qx.ui.basic.Label(
        `${slug} → ${truncateMiddle(entry.targetUrl, 56)}`,
      );
      line1.setWrap(true);
      line1.setTextColor(AppColors.foreground());
      const headRow = new qx.ui.container.Composite(
        new qx.ui.layout.HBox(8).set({ alignY: "middle" }),
      );
      headRow.setAllowGrowX(true);
      headRow.add(line1, { flex: 1 });
      headRow.add(this.__historyQrHtml(shortUrl));
      const btnRow = new qx.ui.container.Composite(
        new qx.ui.layout.HBox(6).set({ alignY: "middle" }),
      );
      const copyShort = new BsButton("Copy", undefined, { variant: "outline", size: "sm" });
      copyShort.onClick(() => this.__copyUrlText(shortUrl));
      const delBtn = new BsButton("Delete", undefined, { variant: "destructive", size: "sm" });
      delBtn.onClick(() => {
        LinkStore.remove(slug);
        if (this.__lastShortUrl === shortUrl) {
          this.__lastShortUrl = "";
          this.__shortUrlLabel.setValue("—");
          this.__clearMainQr();
        }
        this.__renderRecent();
        BsToast.info("Removed", slug);
      });
      const qrBtn = new BsButton("QR", undefined, { variant: "outline", size: "sm" });
      qrBtn.onClick(() => this.__showRecentQrPopup(shortUrl));
      btnRow.add(copyShort);
      btnRow.add(qrBtn);
      btnRow.add(delBtn);
      btnRow.add(new qx.ui.core.Spacer(), { flex: 1 });
      row.add(headRow);
      row.add(btnRow);
      this.__recentBody.add(row);
    }
  }
}

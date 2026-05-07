type BsToastPlacement =
  | "top-start"
  | "top-center"
  | "top-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end"
  | "custom";

type BsToastAlign = "start" | "center" | "end";

/**
 * Basecoat-style toaster. Listens for `basecoat:toast` on document (capture).
 * Static `BsToast.show` / `info` / … append to `#toaster` in index.html (or create one).
 */
class BsToast extends qx.ui.core.Widget {
  static events = {
    show: "qx.event.type.Data",
    hide: "qx.event.type.Data",
  };

  private static __domToaster: HTMLDivElement | null = null;
  private static __domToasts: Map<
    number,
    { timeout: number; close: () => void }
  > = new Map();
  private static __domToastSeq = 0;

  /** Global toast (DOM under `#toaster`); works without embedding a BsToast widget. */
  static show(config: BsToastShowConfig = {}): void {
    BsToast.__domShow(config);
  }

  static info(title: string, description?: string): void {
    BsToast.show({ title, description, category: "info" });
  }

  static success(title: string, description?: string): void {
    BsToast.show({ title, description, category: "success" });
  }

  static warning(title: string, description?: string): void {
    BsToast.show({ title, description, category: "warning" });
  }

  static error(title: string, description?: string): void {
    BsToast.show({ title, description, category: "error" });
  }

  private static __getOrCreateDomToaster(): HTMLDivElement {
    if (BsToast.__domToaster) return BsToast.__domToaster;

    const existing = document.getElementById("toaster");
    if (existing instanceof HTMLDivElement) {
      existing.classList.add("toaster");
      if (!existing.getAttribute("data-align")) {
        existing.setAttribute("data-align", "end");
      }
      BsToast.__domToaster = existing;
      return existing;
    }

    const toaster = document.createElement("div");
    toaster.id = "bs-toaster";
    toaster.className = "toaster";
    toaster.setAttribute("data-align", "end");
    document.body.appendChild(toaster);
    BsToast.__domToaster = toaster;
    return toaster;
  }

  private static __domShow(config: BsToastShowConfig): void {
    const toaster = BsToast.__getOrCreateDomToaster();
    const toast = BsToast.__createDomToastElement(config);
    toaster.appendChild(toast);

    const cat = String(config.category || "").toLowerCase();
    const duration =
      typeof config.duration === "number"
        ? config.duration
        : cat === "error"
          ? 5000
          : 3000;

    const toastId = BsToast.__domToastSeq++;

    const close = () => {
      const entry = BsToast.__domToasts.get(toastId);
      if (entry) clearTimeout(entry.timeout);
      BsToast.__domToasts.delete(toastId);
      toast.remove();
    };

    const timeout = window.setTimeout(close, duration);
    BsToast.__domToasts.set(toastId, { timeout, close });
  }

  private static __createDomToastElement(
    config: BsToastShowConfig,
  ): HTMLDivElement {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-atomic", "true");
    toast.setAttribute("aria-hidden", "false");
    if (config.category) {
      toast.setAttribute("data-category", config.category);
    }

    const content = document.createElement("div");
    content.className = "toast-content";

    if (config.category) {
      const icon = BsToast.__getDomCategoryIcon(config.category);
      content.appendChild(icon);
    }

    const section = document.createElement("section");

    const titleEl = document.createElement("h2");
    titleEl.textContent = config.title != null ? String(config.title) : "";
    section.appendChild(titleEl);

    if (config.description) {
      const desc = document.createElement("p");
      desc.textContent = String(config.description);
      section.appendChild(desc);
    }

    content.appendChild(section);

    const action = config.action;
    if (action && action.label) {
      const footer = document.createElement("footer");

      if (action.onclick) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm-primary";
        btn.textContent = action.label;
        btn.onclick = (e) => {
          e.preventDefault();
          action.onclick!(() => {
            toast.remove();
          });
        };
        footer.appendChild(btn);
      } else if (action.onClick) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm-primary";
        btn.textContent = action.label;
        btn.onclick = (e) => {
          e.preventDefault();
          action.onClick!({
            id: toast.id || "",
            toast,
            category: String(config.category || "info"),
          });
          toast.remove();
        };
        footer.appendChild(btn);
      }

      content.appendChild(footer);
    }

    if (config.cancel) {
      const footer =
        content.querySelector("footer") || document.createElement("footer");

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-sm-outline";
      cancelBtn.textContent = config.cancel.label ?? "Dismiss";
      if (config.cancel.onclick) {
        cancelBtn.onclick = (e) => {
          e.preventDefault();
          config.cancel!.onclick!();
          toast.remove();
        };
      } else {
        cancelBtn.onclick = (e) => {
          e.preventDefault();
          toast.remove();
        };
      }
      footer.appendChild(cancelBtn);

      if (!content.querySelector("footer")) {
        content.appendChild(footer);
      }
    }

    toast.appendChild(content);
    return toast;
  }

  private static __getDomCategoryIcon(category: string): HTMLElement {
    const iconContainer = document.createElement("div");
    iconContainer.setAttribute("aria-hidden", "true");
    const c = category.toLowerCase() as
      | "success"
      | "info"
      | "warning"
      | "error";
    const icons: Record<string, string> = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
    };
    iconContainer.innerHTML = icons[c] || icons.info;
    return iconContainer;
  }

  private __html: qx.ui.embed.Html;
  private readonly __toasterId: string;
  private __timers: Record<string, number> = {};
  private __removeTimers: Record<string, number> = {};
  private __documentToastListener: ((evt: Event) => void) | null = null;
  private __idSeq = 0;
  private __toasterRetryScheduled = false;

  private __placement: BsToastPlacement = "top-end";
  private __align: BsToastAlign = "end";
  private __offsetX = 16;
  private __offsetY = 16;
  private __defaultDuration = 4000;
  private __stackLimit = 5;
  private __richDescription = false;

  constructor() {
    super();
    this._setLayout(new qx.ui.layout.Canvas());
    this.__toasterId = "toaster-" + this.toHashCode();

    this.__html = new qx.ui.embed.Html(`
      <div id="${this.__toasterId}" class="toaster" data-align="${this.__align}"></div>
    `);
    this._add(this.__html, { edge: 0 });

    this.__html.addListenerOnce("appear", () => {
      this.__applyPlacement(this.__placement);
    });

    this.__documentToastListener = (evt: Event) => {
      if (this.isDisposed()) return;
      evt.stopImmediatePropagation();
      const ce = evt as CustomEvent;
      const detail = ce && ce.detail ? ce.detail : {};
      const config = (detail as { config?: BsToastShowConfig }).config || {};
      this.show(config);
    };

    document.addEventListener(
      "basecoat:toast",
      this.__documentToastListener,
      true,
    );
  }

  private __escapeHtml(text: string | null | undefined): string {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private __getToasterElement(): HTMLElement | null {
    const host = this.__html.getContentElement()?.getDomElement() as
      | HTMLElement
      | null
      | undefined;
    return host ? host.querySelector("#" + this.__toasterId) : null;
  }

  setAlign(value: BsToastAlign): this {
    this.__align = value || "end";
    const toaster = this.__getToasterElement();
    if (toaster) toaster.setAttribute("data-align", this.__align);
    this.__applyPlacement(this.__placement);
    return this;
  }

  getAlign(): BsToastAlign {
    return this.__align;
  }

  setPlacement(value: BsToastPlacement): this {
    this.__placement = value || "top-end";
    this.__applyPlacement(this.__placement);
    return this;
  }

  getPlacement(): BsToastPlacement {
    return this.__placement;
  }

  setOffsetX(value: number): this {
    this.__offsetX = value;
    this.__applyPlacement(this.__placement);
    return this;
  }

  getOffsetX(): number {
    return this.__offsetX;
  }

  setOffsetY(value: number): this {
    this.__offsetY = value;
    this.__applyPlacement(this.__placement);
    return this;
  }

  getOffsetY(): number {
    return this.__offsetY;
  }

  setDefaultDuration(value: number): this {
    this.__defaultDuration = value;
    return this;
  }

  getDefaultDuration(): number {
    return this.__defaultDuration;
  }

  setStackLimit(value: number): this {
    this.__stackLimit = value;
    return this;
  }

  getStackLimit(): number {
    return this.__stackLimit;
  }

  setRichDescription(value: boolean): this {
    this.__richDescription = !!value;
    return this;
  }

  getRichDescription(): boolean {
    return this.__richDescription;
  }

  private __applyPlacement(_value: BsToastPlacement): void {
    const toaster = this.__getToasterElement();
    if (!toaster) return;

    const placement = this.__placement || "top-end";
    const offsetX = this.__offsetX;
    const offsetY = this.__offsetY;
    const align = this.__align || "end";

    toaster.style.position = "fixed";
    toaster.style.zIndex = "10000";
    toaster.style.left = "";
    toaster.style.right = "";
    toaster.style.top = "";
    toaster.style.bottom = "";
    toaster.style.transform = "";

    if (placement !== "custom") {
      const [vertical, horizontal] = placement.split("-");
      if (vertical === "bottom") {
        toaster.style.bottom = `${offsetY}px`;
      } else {
        toaster.style.top = `${offsetY}px`;
      }

      if (horizontal === "start") {
        toaster.style.left = `${offsetX}px`;
      } else if (horizontal === "center") {
        toaster.style.left = "50%";
        toaster.style.transform = "translateX(-50%)";
      } else {
        toaster.style.right = `${offsetX}px`;
      }
      toaster.setAttribute("data-align", horizontal || align);
    } else {
      toaster.style.top = `${offsetY}px`;
      if (align === "start") {
        toaster.style.left = `${offsetX}px`;
      } else if (align === "center") {
        toaster.style.left = "50%";
        toaster.style.transform = "translateX(-50%)";
      } else {
        toaster.style.right = `${offsetX}px`;
      }
    }
  }

  private __getCategoryIcon(category: string): string {
    const c = (category || "").toLowerCase();
    if (c === "success") {
      return '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>';
    }
    if (c === "error" || c === "destructive" || c === "danger") {
      return '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>';
    }
    if (c === "warning") {
      return '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
    }
    return '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>';
  }

  private __nextToastId(): string {
    this.__idSeq += 1;
    return this.__toasterId + "-toast-" + this.__idSeq;
  }

  private __clearToastTimers(toastId: string): void {
    if (this.__timers[toastId]) {
      clearTimeout(this.__timers[toastId]);
      delete this.__timers[toastId];
    }
    if (this.__removeTimers[toastId]) {
      clearTimeout(this.__removeTimers[toastId]);
      delete this.__removeTimers[toastId];
    }
  }

  private __enforceStackLimit(): void {
    const limit = this.__stackLimit;
    if (!limit || limit <= 0) return;
    const toaster = this.__getToasterElement();
    if (!toaster) return;

    const visibleToasts = Array.from(
      toaster.querySelectorAll(".toast"),
    ) as HTMLElement[];
    if (visibleToasts.length <= limit) return;

    const toRemove = visibleToasts.slice(limit);
    toRemove.forEach((node: HTMLElement) => {
      const id = node.id;
      if (id) {
        this.__clearToastTimers(id);
      }
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      if (id) {
        this.fireDataEvent("hide", id);
      }
    });
  }

  show(config: BsToastShowConfig = {}): string | null {
    const tryShow = (): string | null => {
      const toaster = this.__getToasterElement();
      if (!toaster) {
        if (!this.__toasterRetryScheduled) {
          this.__toasterRetryScheduled = true;
          setTimeout(() => {
            this.__toasterRetryScheduled = false;
            tryShow();
          }, 100);
        }
        return null;
      }

      const toastId = this.__nextToastId();
      const category = String(config.category || "info").toLowerCase();
      const title = this.__escapeHtml(String(config.title || "Notification"));
      const descRaw =
        config.description != null ? String(config.description) : "";
      const description = this.__richDescription
        ? descRaw
        : this.__escapeHtml(descRaw);

      const action =
        config.action && typeof config.action === "object"
          ? config.action
          : null;
      const cancel =
        config.cancel && typeof config.cancel === "object"
          ? config.cancel
          : null;

      const actionLabel =
        action && action.label
          ? this.__escapeHtml(String(action.label))
          : "";
      const cancelLabel =
        cancel && cancel.label
          ? this.__escapeHtml(String(cancel.label))
          : "Dismiss";

      const toast = document.createElement("div");
      toast.className = "toast";
      toast.id = toastId;
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-atomic", "true");
      toast.setAttribute("aria-hidden", "false");
      toast.setAttribute("data-category", category);

      const actionHtml = actionLabel
        ? `<button type="button" class="btn btn-sm" data-toast-action>${actionLabel}</button>`
        : "";
      const cancelHtml =
        cancel !== null
          ? `<button type="button" class="btn btn-sm" data-toast-cancel style="background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border); white-space: nowrap;">${cancelLabel}</button>`
          : "";
      const footerHtml =
        actionHtml || cancelHtml
          ? `<footer style="display: flex; gap: 8px; margin-top: 12px;">${actionHtml}${cancelHtml}</footer>`
          : "";

      toast.innerHTML = `
          <div class="toast-content" style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="flex-shrink: 0;">${this.__getCategoryIcon(category)}</div>
            <section style="flex: 1; min-width: 0;">
              <h2 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${title}</h2>
              <p style="margin: 0; font-size: 14px; color: var(--muted-foreground);">${description}</p>
            </section>
            ${footerHtml}
          </div>
        `;

      toaster.insertBefore(toast, toaster.firstChild);
      this.__enforceStackLimit();

      const actionBtn = toast.querySelector("[data-toast-action]");
      if (actionBtn && action) {
        actionBtn.addEventListener("click", () => {
          if (typeof action.onClick === "function") {
            action.onClick({ id: toastId, toast, category });
          }
          this.dismiss(toastId);
        });
      }

      const cancelBtn = toast.querySelector("[data-toast-cancel]");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          this.dismiss(toastId);
        });
      }

      const duration =
        typeof config.duration === "number"
          ? config.duration
          : this.__defaultDuration;
      if (duration > 0) {
        this.__timers[toastId] = setTimeout(
          () => this.dismiss(toastId),
          duration,
        ) as unknown as number;
      }

      this.fireDataEvent("show", toastId);
      return toastId;
    };

    return tryShow();
  }

  toast(config: BsToastShowConfig = {}): string | null {
    return this.show(config);
  }

  dismiss(toastId: string): void {
    const toaster = this.__getToasterElement();
    if (!toaster || !toastId) return;
    const toast = toaster.ownerDocument.getElementById(toastId);
    if (!toast) return;

    this.__clearToastTimers(toastId);

    toast.setAttribute("aria-hidden", "true");
    this.__removeTimers[toastId] = setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      delete this.__removeTimers[toastId];
      this.fireDataEvent("hide", toastId);
    }, 320) as unknown as number;
  }

  clear(): void {
    const toaster = this.__getToasterElement();
    if (!toaster) return;

    const ids = Object.keys(this.__timers).concat(
      Object.keys(this.__removeTimers),
    );
    ids.forEach((id) => this.__clearToastTimers(id));

    toaster.querySelectorAll(".toast").forEach((node) => {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
  }

  destruct(): void {
    this.clear();
    if (this.__documentToastListener) {
      document.removeEventListener(
        "basecoat:toast",
        this.__documentToastListener,
        true,
      );
      this.__documentToastListener = null;
    }
    this.__timers = {};
    this.__removeTimers = {};
    super.destruct();
  }
}

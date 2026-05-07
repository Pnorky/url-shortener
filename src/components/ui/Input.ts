type BsValidationState = "default" | "error" | "success";

class BsInput extends qx.ui.basic.Atom {
  static events = {
    input: "qx.event.type.Data",
    changeValue: "qx.event.type.Data",
  };

  private __htmlInput: qx.ui.embed.Html;
  private __value: string;
  private __placeholder: string;
  private __className: string;
  private __leadingHtml = "";
  private __inputEl: HTMLInputElement | null = null;
  private __resizeObserver: ResizeObserver | null = null;
  private __validationState: BsValidationState = "default";
  private __helperText = "";

  constructor(value?: string, placeholder?: string, className?: string) {
    super();

    this._setLayout(new qx.ui.layout.Grow());
    this.setAllowGrowX(true);

    // important for qooxdoo focus manager
    this.setFocusable(true);

    this.__value = value ?? "";
    this.__placeholder = placeholder ?? "";
    this.__className = className ?? "";

    this.__htmlInput = new qx.ui.embed.Html("");
    this.__htmlInput.setAllowGrowX(true);

    this.__render();
    this._add(this.__htmlInput);

    this.__htmlInput.addListenerOnce("appear", () => {
      this.__finalizeDom();
      this.__setupResizeObserver();
    });

    // when widget gets focus from Tab, move focus to native input
    this.addListener("focusin", () => {
      this.__inputEl?.focus();
    });

    // keep native tabindex in sync
    this.addListener("changeTabIndex", () => {
      this.__syncTabIndex();
    });
  }

  private __syncTabIndex(): void {
    if (!this.__inputEl) return;
    this.__inputEl.setAttribute("tabindex", "1");
  }

  private __setupResizeObserver(): void {
    const root = this.__htmlInput.getContentElement().getDomElement();
    if (!root) return;

    this.__resizeObserver?.disconnect();
    this.__resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutUpdate();
    });
    this.__resizeObserver.observe(root);

    this.addListener("disappear", () => {
      this.__resizeObserver?.disconnect();
    });
  }

  private __escapeAttr(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private __escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private __borderClasses(): string {
    switch (this.__validationState) {
      case "error":
        return "border-destructive focus-visible:ring-destructive/40";
      case "success":
        return "border-emerald-600 focus-visible:ring-emerald-600/40";
      default:
        return "border-border focus-visible:ring-ring";
    }
  }

  private __helperColorClass(): string {
    return this.__validationState === "error" ? "text-destructive" : "text-muted-foreground";
  }

  private __render(): void {
    const hasLeadingIcon = this.__leadingHtml.length > 0;
    const border = this.__borderClasses();
    const classes = [
      "input",
      "bg-card",
      "text-foreground",
      border,
      "placeholder:text-muted-foreground",
      hasLeadingIcon ? "pl-9" : "",
      this.__className,
    ]
      .filter(Boolean)
      .join(" ");
    const value = this.__escapeAttr(this.__value);
    const placeholder = this.__escapeAttr(this.__placeholder);
    const tabIndexAttr = 'tabindex="-1"';

    const helperBlock =
      this.__helperText.length > 0
        ? `<p class="text-xs px-1 pt-0.5 ${this.__helperColorClass()}">${this.__escapeHtml(this.__helperText)}</p>`
        : "";

    this.__htmlInput.setHtml(`
        <div class="flex w-full flex-col gap-0">
          <div class="relative p-1">
              ${
                hasLeadingIcon
                  ? `<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">${this.__leadingHtml}</span>`
                  : ""
              }
              <input
              type="text"
              class="${classes}"
              value="${value}"
              placeholder="${placeholder}"
              ${tabIndexAttr}
              />
          </div>
          ${helperBlock}
        </div>
    `);

    this.__finalizeDom();
  }

  private __finalizeDom(): void {
    const root = this.__htmlInput.getContentElement().getDomElement();
    this.__inputEl = root?.querySelector("input") ?? null;
    if (!this.__inputEl) return;

    this.__inputEl.value = this.__value;
    this.__syncTabIndex();

    this.__inputEl.addEventListener("input", () => {
      const next = this.__inputEl?.value ?? "";
      const prev = this.__value;
      this.__value = next;

      this.fireDataEvent("input", next);
      if (prev !== next) this.fireDataEvent("changeValue", next);
    });
  }

  public getValue(): string {
    return this.__inputEl?.value ?? this.__value;
  }

  public setValue(value: string): this {
    this.__value = value ?? "";
    if (this.__inputEl) this.__inputEl.value = this.__value;
    else this.__render();
    return this;
  }

  public setPlaceholder(value: string): this {
    this.__placeholder = value ?? "";
    if (this.__inputEl) this.__inputEl.placeholder = this.__placeholder;
    else this.__render();
    return this;
  }

  public setLeadingHtml(html: string): this {
    this.__leadingHtml = html ?? "";
    this.__render();
    return this;
  }

  public setHelperText(text: string): this {
    this.__helperText = text ?? "";
    this.__render();
    return this;
  }

  public setValidationState(state: BsValidationState): this {
    this.__validationState = state;
    this.__render();
    return this;
  }

  public getValidationState(): BsValidationState {
    return this.__validationState;
  }

  public onInput(handler: (value: string) => void): this {
    this.addListener("input", (ev: qx.event.type.Data) => {
      handler((ev.getData() as string) ?? "");
    });
    return this;
  }
}

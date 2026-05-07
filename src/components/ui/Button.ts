type BsButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";
type BsButtonSize = "default" | "sm" | "lg" | "icon" | "sm-icon" | "lg-icon";

class BsButton extends qx.ui.basic.Atom {
  static events = {
    execute: "qx.event.type.Event",
  };

  private __htmlButton: qx.ui.embed.Html;
  private __iconHtml: string;
  private __buttonText: string;
  private __className: string;
  private __variant: BsButtonVariant = "default";
  private __size: BsButtonSize = "default";
  private __buttonEl: HTMLButtonElement | null = null;
  private __resizeObserver: ResizeObserver | null = null;

  constructor(
    text?: string,
    icon?: InlineSvgIcon,
    options?: {
      variant?: BsButtonVariant;
      size?: BsButtonSize;
      className?: string;
    },
  ) {
    super();

    this._setLayout(new qx.ui.layout.Grow());
    this.setAllowGrowX(true);
    this.setFocusable(true);

    this.__iconHtml = icon ? icon.getHtml() : "";
    this.__buttonText = text ?? "";
    this.__className = options?.className ?? "";
    this.__variant = options?.variant ?? "default";
    this.__size = options?.size ?? "default";

    this.__htmlButton = new qx.ui.embed.Html("");

    this.__renderButton();
    this._add(this.__htmlButton);

    this.__htmlButton.addListener("tap", () => this.fireEvent("execute"));

    this.__htmlButton.addListenerOnce("appear", () => {
      this.__bindNativeButton();
      this.__setupResizeObserver();
    });

    this.addListener("focusin", () => this.__buttonEl?.focus());
    this.addListener("changeTabIndex", () => this.__syncTabIndex());
    this.addListener("changeEnabled", () => this.__syncDisabled());

    if (icon) {
      icon.addListener("changeHtml", () => {
        this.__iconHtml = icon.getHtml();
        this.__renderButton();
      });
    }
  }

  private __bindNativeButton(): void {
    const root = this.__htmlButton.getContentElement().getDomElement();
    this.__buttonEl =
      (root?.querySelector("button") as HTMLButtonElement) ?? null;
    if (!this.__buttonEl) return;

    this.__syncTabIndex();
    this.__syncMinWidth();
    this.__syncDisabled();
  }

  private __syncMinWidth(): void {
    if (!this.__buttonEl) return;
    const width = this.__buttonEl.offsetWidth;
    if (width > 0) {
      this.setMinWidth(width);
    }
  }

  private __syncTabIndex(): void {
    if (!this.__buttonEl) return;
    this.__buttonEl.setAttribute("tabindex", "-1");
  }

  private __syncDisabled(): void {
    if (!this.__buttonEl) return;
    if (this.getEnabled()) {
      this.__buttonEl.removeAttribute("disabled");
    } else {
      this.__buttonEl.setAttribute("disabled", "true");
    }
  }

  private __setupResizeObserver(): void {
    const root = this.__htmlButton.getContentElement().getDomElement();
    if (!root) return;

    this.__resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutUpdate();
    });
    this.__resizeObserver.observe(root);

    this.addListener("disappear", () => {
      this.__resizeObserver?.disconnect();
    });
  }

  private __renderButton(): void {
    const isIconSize = this.__size === "icon" || this.__size === "sm-icon";
    const iconPart = this.__iconHtml
      ? `<span class="${isIconSize ? "" : "me-2"}">${this.__iconHtml}</span>`
      : "";
    const tabIndexAttr = 'tabindex="-1"';
    const variantClass = this.__resolveVariantClass();
    const sizeClass = this.__resolveSizeClass();
    const classes = [variantClass, sizeClass, this.__className]
      .filter(Boolean)
      .join(" ");

    this.__htmlButton.setHtml(`
      <center class="p-1 h-full flex items-center justify-center">
        <button type="button" class="w-full ${classes}" ${tabIndexAttr} style="user-select:none">
          ${iconPart}
          ${this.__buttonText}
        </button>
      </center>
    `);

    qx.event.Timer.once(() => this.__bindNativeButton(), this, 0);
  }

  private __resolveVariantClass(): string {
    const variantMap: Record<BsButtonVariant, string> = {
      default: "primary",
      secondary: "secondary",
      destructive: "destructive",
      outline: "outline",
      ghost: "ghost",
      link: "link",
    };

    const variantSuffix = variantMap[this.__variant];
    const isIconSize =
      this.__size === "icon" ||
      this.__size === "sm-icon" ||
      this.__size === "lg-icon";
    const sizePrefix = isIconSize ? "icon" : this.__size;

    if (sizePrefix === "default") {
      return `btn-${variantSuffix}`;
    }
    return `btn-${sizePrefix}-${variantSuffix}`;
  }

  private __resolveSizeClass(): string {
    return "";
  }

  public getVariant(): BsButtonVariant {
    return this.__variant;
  }

  public setVariant(variant: BsButtonVariant): this {
    this.__variant = variant;
    this.__renderButton();
    return this;
  }

  public getSize(): BsButtonSize {
    return this.__size;
  }

  /** Updates visible label without recreating the widget (avoids layout jumps). */
  public setLabelText(text: string): this {
    this.__buttonText = text ?? "";
    this.__renderButton();
    return this;
  }

  public onClick(handler: () => void): this {
    this.addListener("execute", handler);
    return this;
  }
}

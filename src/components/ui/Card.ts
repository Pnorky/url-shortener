class BsCard extends qx.ui.container.Composite {
  private __content: qx.ui.container.Composite | null = null;
  private __resizeObserver: ResizeObserver | null = null;

  constructor(options?: { className?: string }) {
    super(new qx.ui.layout.VBox(0).set({ alignY: "middle", alignX: "center" }));
    this.setAllowGrowX(true);
    this.setAllowGrowY(true);

    this.setBackgroundColor("var(--card)");
    this.setDecorator(
      new qx.ui.decoration.Decorator().set({
        radius: 8,
        style: "solid",
        width: 1,
        color: "var(--border)",
      }),
    );
  }

  setContent(widget: qx.ui.core.Widget): this {
    if (this.__content) {
      this.__content.dispose();
    }

    const layout = new qx.ui.layout.VBox(0).set({
      alignY: "middle",
      alignX: "center",
    });
    this.__content = new qx.ui.container.Composite(layout);
    this.__content.setAllowGrowX(true);
    this.__content.setAllowGrowY(true);
    this.__content.setPadding(24);
    this._add(this.__content);

    this.__content.add(widget);
    this.__setupResizeObserver();
    return this;
  }

  private __setupResizeObserver(): void {
    if (!this.__content) return;
    const root = this.__content.getContentElement?.().getDomElement?.();
    if (!root) {
      qx.event.Timer.once(() => this.__setupResizeObserver(), this, 50);
      return;
    }

    this.__resizeObserver = new ResizeObserver(() => {
      this.scheduleLayoutUpdate();
    });
    this.__resizeObserver.observe(root);

    this.addListener("disappear", () => {
      this.__resizeObserver?.disconnect();
    });
  }

  removeContent(): this {
    if (this.__content) {
      this._remove(this.__content);
      this.__content.dispose();
      this.__content = null;
    }
    return this;
  }
}

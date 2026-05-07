/** Minimal declarations for link-shortener widgets (see menubar for full set). */

declare class InlineSvgIcon extends qx.ui.embed.Html {
  constructor(name: string, size?: number);
  getHtml(): string;
}

interface BsButton {
  getVariant():
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  setVariant(
    variant:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link",
  ): this;
  getSize(): "default" | "sm" | "lg" | "icon" | "sm-icon" | "lg-icon";
  setLabelText(text: string): this;
  onClick(handler: () => void): this;
}

interface BsInput {
  getValue(): string;
  setValue(value: string): this;
  setPlaceholder(value: string): this;
  setLeadingHtml(html: string): this;
  setHelperText(text: string): this;
  setValidationState(state: "default" | "error" | "success"): this;
  getValidationState(): "default" | "error" | "success";
  onInput(handler: (value: string) => void): this;
}

interface BsToastShowConfig {
  category?: string;
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick?: (detail: {
      id: string;
      toast: HTMLElement;
      category: string;
    }) => void;
    onclick?: (close: () => void) => void;
  };
  cancel?: { label?: string; onclick?: () => void } | null;
}

interface BsToast {
  setAlign(value: "start" | "center" | "end"): this;
  getAlign(): "start" | "center" | "end";
  setPlacement(value: string): this;
  getPlacement(): string;
  setOffsetX(value: number): this;
  getOffsetX(): number;
  setOffsetY(value: number): this;
  getOffsetY(): number;
  setDefaultDuration(value: number): this;
  getDefaultDuration(): number;
  setStackLimit(value: number): this;
  getStackLimit(): number;
  setRichDescription(value: boolean): this;
  getRichDescription(): boolean;
  show(config?: BsToastShowConfig): string | null;
  toast(config?: BsToastShowConfig): string | null;
  dismiss(toastId: string): void;
  clear(): void;
}

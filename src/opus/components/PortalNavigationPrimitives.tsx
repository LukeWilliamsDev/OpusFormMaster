import React, { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "@/lib/utils/cx";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type PortalViewSwitcherItem = {
  label: string;
  to: string;
  active: boolean;
};

export const PortalViewSwitcher: React.FC<{
  items: readonly PortalViewSwitcherItem[];
  ariaLabel: string;
  className?: string;
}> = ({ items, ariaLabel, className }) => (
  <nav
    aria-label={ariaLabel}
    className={cx("flex min-w-0 overflow-x-auto border-b border-border", className)}
  >
    <div className="flex min-w-max items-stretch gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          aria-current={item.active ? "page" : undefined}
          className={cx(
            focusRing,
            "relative flex min-h-12 items-center justify-center whitespace-nowrap px-3 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground sm:px-4",
            item.active && "font-semibold text-foreground after:bg-primary",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  </nav>
);

export type PortalTabItem = {
  label: string;
  active: boolean;
  count?: number;
  onSelect: () => void;
};

export const PortalTabRail: React.FC<{
  items: readonly PortalTabItem[];
  ariaLabel: string;
  className?: string;
}> = ({ items, ariaLabel, className }) => {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    items.findIndex((item) => item.active),
    0,
  );

  const moveFocus = (index: number) => {
    const nextIndex = (index + items.length) % items.length;
    tabRefs.current[nextIndex]?.focus();
    items[nextIndex]?.onSelect();
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx("flex min-w-0 overflow-x-auto border-b border-border", className)}
    >
      <div className="flex min-w-max items-stretch gap-1">
        {items.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            aria-pressed={item.active}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={item.onSelect}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                moveFocus(index + 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveFocus(0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveFocus(items.length - 1);
              }
            }}
            className={cx(
              focusRing,
              "relative flex min-h-12 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground sm:px-4",
              item.active && "font-semibold text-foreground after:bg-primary",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export type PortalFilterOption<T extends string> = {
  value: T;
  label: string;
};

export const PortalFilterGroup = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly PortalFilterOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) => (
  <div className="min-w-0">
    <label className="sr-only" htmlFor={`${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-select`}>
      {ariaLabel}
    </label>
    <select
      id={`${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-select`}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:hidden"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <div
      className="hidden min-w-0 items-center gap-1 overflow-x-auto border-b border-border sm:flex"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cx(
            focusRing,
            "relative min-h-11 shrink-0 whitespace-nowrap px-3 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground",
            value === option.value && "font-semibold text-foreground after:bg-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

export const PortalPageHeader: React.FC<{
  back?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
}> = ({ back, eyebrow, title, description, meta, action }) => (
  <header className="flex flex-col gap-4">
    {back}
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-semibold text-primary">{eyebrow}</p>}
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-3 text-sm text-muted-foreground">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </header>
);

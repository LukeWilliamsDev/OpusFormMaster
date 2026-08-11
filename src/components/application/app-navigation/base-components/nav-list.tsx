import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

interface NavListProps {
  /** URL of the currently active item. */
  activeUrl?: string;
  /** Additional CSS classes to apply to the list. */
  className?: string;
  /** List of items to display. */
  items: (NavItemType | NavItemDividerType)[];
  /** Whether to show icon-only items (collapsed sidebar). */
  iconOnly?: boolean;
  /** Override active-state check per item (falls back to href === activeUrl). */
  isActive?: (item: NavItemType) => boolean;
}

export const NavList = ({
  activeUrl,
  items,
  className,
  iconOnly = false,
  isActive,
}: NavListProps) => {
  const activeItem = items.find(
    (item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl),
  );
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("portal-nav-collapsed-sections");
    if (stored) return new Set(JSON.parse(stored) as string[]);

    let label: string | null = null;
    let activeLabel: string | null = null;
    const labels: string[] = [];
    for (const item of items) {
      if (item.divider) {
        label = item.label ?? null;
        if (label) labels.push(label);
        continue;
      }
      if (label && (item.href === activeUrl || item.items?.some((s) => s.href === activeUrl))) {
        activeLabel = label;
      }
    }
    return new Set(labels.filter((l) => l !== activeLabel));
  });
  const toggleSection = (label: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      localStorage.setItem("portal-nav-collapsed-sections", JSON.stringify([...next]));
      return next;
    });

  // Track which labeled section the current item falls under, so it can be hidden when collapsed.
  let currentSection: string | null = null;

  return (
    <ul className={cx("flex flex-col", className)}>
      {items.map((item, index) => {
        if (item.divider) {
          currentSection = item.label ?? null;
          if (!item.label) {
            return (
              <li key={index} className="w-full px-0.5 py-2">
                <hr className="h-px w-full border-none bg-border" />
              </li>
            );
          }
          const collapsed = collapsedSections.has(item.label);
          if (iconOnly) {
            return (
              <li key={index} className="w-full px-2 py-1.5" title={item.label}>
                <hr className="h-px w-full border-none bg-border" />
              </li>
            );
          }
          return (
            <li key={index} className="w-full px-0.5 pt-4 pb-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(item.label!);
                }}
                className="flex w-full items-center justify-between px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                <span>{item.label}</span>
                <ChevronDown
                  className={cx(
                    "h-3 w-3 transition-transform",
                    collapsed ? "-rotate-90" : "rotate-0",
                  )}
                />
              </button>
            </li>
          );
        }

        if (currentSection && collapsedSections.has(currentSection)) {
          return null;
        }

        if (item.items?.length) {
          return (
            <details
              key={item.label}
              open={activeItem?.href === item.href}
              className="appearance-none py-0.25"
            >
              <NavItemBase href={item.href} icon={item.icon} type="collapsible" iconOnly={iconOnly}>
                {item.label}
              </NavItemBase>

              <dd>
                <ul className="pb-1">
                  {item.items.map((childItem) => (
                    <li key={childItem.label} className="py-0.25">
                      <NavItemBase
                        href={childItem.href}
                        type="collapsible-child"
                        current={activeUrl === childItem.href}
                      >
                        {childItem.label}
                      </NavItemBase>
                    </li>
                  ))}
                </ul>
              </dd>
            </details>
          );
        }

        return (
          <li key={item.label} className="py-px">
            <NavItemBase
              type="link"
              icon={item.icon}
              href={item.href}
              iconOnly={iconOnly}
              current={isActive ? isActive(item) : activeUrl === item.href}
            >
              {item.label}
            </NavItemBase>
          </li>
        );
      })}
    </ul>
  );
};

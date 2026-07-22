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

  return (
    <ul className={cx("flex flex-col", className)}>
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <li key={index} className="w-full px-0.5 py-2">
              <hr className="h-px w-full border-none bg-border" />
            </li>
          );
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

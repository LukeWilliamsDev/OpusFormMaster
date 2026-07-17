import type { FC, HTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Link as RouterLink } from "react-router-dom";
import { cx, sortCx } from "@/lib/utils/cx";

const styles = sortCx({
    root: "group relative flex max-h-9 w-full cursor-pointer items-center rounded-lg text-muted-foreground outline-none transition-colors duration-200 select-none hover:text-foreground hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
    rootSelected: "bg-primary text-white shadow-md hover:bg-primary hover:text-white",
});

interface NavItemBaseProps {
    /** Whether the nav item shows only an icon (collapsed sidebar). */
    iconOnly?: boolean;
    /** Whether the collapsible nav item is open. */
    open?: boolean;
    /** URL to navigate to when the nav item is clicked. */
    href?: string;
    /** Type of the nav item. */
    type: "link" | "collapsible" | "collapsible-child";
    /** Icon component to display. */
    icon?: FC<HTMLAttributes<HTMLOrSVGElement>>;
    /** Whether the nav item is currently active. */
    current?: boolean;
    /** Whether to truncate the label text. */
    truncate?: boolean;
    /** Handler for click events. */
    onClick?: MouseEventHandler;
    /** Content to display. */
    children?: ReactNode;
}

export const NavItemBase = ({
    current,
    type,
    href,
    icon: Icon,
    children,
    truncate = true,
    iconOnly = false,
    onClick,
}: NavItemBaseProps) => {
    const iconElement = Icon && (
        <Icon
            aria-hidden="true"
            className={cx("size-4 shrink-0 text-inherit transition-inherit-all", !iconOnly && "mr-3")}
        />
    );

    const labelElement = !iconOnly && (
        <span
            className={cx(
                "flex-1 text-[11px] font-semibold uppercase tracking-wider text-inherit transition-inherit-all",
                truncate && "truncate",
            )}
        >
            {children}
        </span>
    );

    if (type === "collapsible") {
        return (
            <summary
                title={iconOnly ? String(children) : undefined}
                className={cx(
                    "p-2",
                    iconOnly ? "justify-center px-0" : "space-x-3 px-3 py-2.5",
                    styles.root,
                    current && styles.rootSelected,
                )}
                onClick={onClick}
            >
                {iconElement}
                {labelElement}
                {!iconOnly && (
                    <ChevronDown
                        aria-hidden="true"
                        className="ml-3 size-4 shrink-0 stroke-[2.5px] text-inherit in-open:-scale-y-100"
                    />
                )}
            </summary>
        );
    }

    if (type === "collapsible-child") {
        return (
            <RouterLink
                to={href!}
                className={cx("py-2 pr-3 pl-10", styles.root, current && styles.rootSelected)}
                onClick={onClick}
                aria-current={current ? "page" : undefined}
            >
                {labelElement}
            </RouterLink>
        );
    }

    return (
        <RouterLink
            to={href!}
            title={iconOnly ? String(children) : undefined}
            className={cx(
                "group/item py-2.5",
                iconOnly ? "justify-center px-0" : "space-x-3 px-3",
                styles.root,
                current && styles.rootSelected,
            )}
            onClick={onClick}
            aria-current={current ? "page" : undefined}
        >
            {iconElement}
            {labelElement}
        </RouterLink>
    );
};

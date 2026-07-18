import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, User as UserIcon } from "lucide-react";
import { cx } from "@/lib/utils/cx";
import type { NavItemType } from "../config";
import { NavList } from "../base-components/nav-list";
import { NavItemBase } from "../base-components/nav-item";

interface SidebarProfile {
    name?: string;
    role?: string;
    avatarClass?: string;
    href?: string;
}

interface SidebarNavigationSlimProps {
    /** Primary nav items. */
    items: (NavItemType & { icon: FC<{ className?: string }> })[];
    /** Secondary/footer nav items (e.g. legal, support). */
    footerItems?: (NavItemType & { icon: FC<{ className?: string }> })[];
    /** Override active-state check per item. */
    isActive?: (item: NavItemType) => boolean;
    /** Whether the sidebar is collapsed to icon-only rail. */
    collapsed?: boolean;
    /** Called when the collapse toggle is clicked. */
    onToggleCollapse?: () => void;
    /** Logo image src, already theme-resolved by the caller. */
    logoSrc: string;
    /** Where the logo links to. */
    logoHref?: string;
    /** Current user profile shown at the top of the sidebar. */
    profile?: SidebarProfile;
    /** Called when the logout button is clicked. */
    onLogout?: () => void;
    /** Current theme, for the light/dark toggle icon. */
    theme?: "dark" | "light";
    /** Called when the theme toggle is clicked. */
    onToggleTheme?: () => void;
    className?: string;
}

export const SidebarNavigationSlim = ({
    items,
    footerItems = [],
    isActive,
    collapsed = false,
    onToggleCollapse,
    logoSrc,
    logoHref = "/",
    profile,
    onLogout,
    theme,
    onToggleTheme,
    className,
}: SidebarNavigationSlimProps) => {
    const initials = profile?.name
        ? profile.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : null;

    return (
        <aside
            className={cx(
                "hidden lg:flex flex-col",
                collapsed ? "w-16" : "w-52 xl:w-56",
                "bg-muted/30 border-r border-border shrink-0 sticky top-0 h-screen z-40 transition-[width] duration-200",
                className,
            )}
        >
            {/* Header: logo + collapse toggle */}
            <div
                className={cx(
                    "p-4 border-b border-border flex items-center",
                    collapsed ? "justify-center" : "justify-between",
                )}
            >
                {!collapsed && (
                    <Link to={logoHref} className="flex items-center group min-w-0">
                        <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
                    </Link>
                )}
                <button
                    onClick={onToggleCollapse}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
            </div>

            {/* Profile banner */}
            {profile && (
                <Link
                    to={profile.href ?? "#"}
                    className={cx(
                        "border-b border-border bg-muted/20 hover:bg-muted/40 transition-all flex items-center group cursor-pointer",
                        collapsed ? "px-0 py-3 justify-center" : "px-4 py-3 space-x-3",
                    )}
                    title={collapsed ? profile.name : undefined}
                >
                    <div
                        className={cx(
                            "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center border border-border shrink-0",
                            profile.avatarClass,
                        )}
                    >
                        {initials ? (
                            <span className="text-[11px] font-black tracking-wider text-white">{initials}</span>
                        ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {profile.name}
                            </span>
                            {profile.role && (
                                <span className="text-[11px] text-success capitalize font-medium mt-0.5">
                                    {profile.role}
                                </span>
                            )}
                        </div>
                    )}
                </Link>
            )}

            {/* Primary nav */}
            <nav className={cx("flex-1 py-4 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
                <NavList items={items} iconOnly={collapsed} isActive={isActive} />
            </nav>

            {/* Footer: secondary links + logout */}
            <div className={cx("border-t border-border bg-muted/20", collapsed ? "p-2 space-y-1" : "p-3 space-y-1")}>
                {footerItems.map((item) => (
                    <NavItemBase
                        key={item.label}
                        type="link"
                        href={item.href}
                        icon={item.icon}
                        iconOnly={collapsed}
                        current={isActive ? isActive(item) : false}
                    >
                        {item.label}
                    </NavItemBase>
                ))}
                {onToggleTheme && collapsed && (
                    <button
                        onClick={onToggleTheme}
                        title="Toggle light/dark theme"
                        aria-label="Toggle light/dark theme"
                        className="flex items-center justify-center w-full py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer"
                    >
                        {theme === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </button>
                )}
                {onToggleTheme && !collapsed && (
                    <div className="flex items-center justify-between rounded-lg py-2.5 px-3">
                        <div className="flex items-center space-x-3 text-muted-foreground">
                            {theme === "light" ? (
                                <Sun className="size-4 shrink-0" />
                            ) : (
                                <Moon className="size-4 shrink-0" />
                            )}
                            <span className="text-[11px] font-semibold uppercase tracking-wider">
                                Light / Dark
                            </span>
                        </div>
                        <button
                            onClick={onToggleTheme}
                            role="switch"
                            aria-checked={theme === "light"}
                            aria-label="Toggle light/dark theme"
                            className="relative w-9 h-5 shrink-0 rounded-full bg-secondary border border-border transition-colors cursor-pointer"
                        >
                            <span
                                className={cx(
                                    "absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-primary shadow transition-transform duration-200",
                                    theme === "light" && "translate-x-4",
                                )}
                            />
                        </button>
                    </div>
                )}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        title={collapsed ? "Log Out" : undefined}
                        className={cx(
                            "flex items-center w-full py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer",
                            collapsed ? "justify-center px-0" : "space-x-3 px-3",
                        )}
                    >
                        <LogOut className="size-4 shrink-0" />
                        {!collapsed && (
                            <span className="text-[11px] font-semibold uppercase tracking-wider">
                                Log Out
                            </span>
                        )}
                    </button>
                )}
            </div>
        </aside>
    );
};

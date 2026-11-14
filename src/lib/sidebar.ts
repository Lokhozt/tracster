/** Desktop sidebar collapsed into its icon rail (per device, remembered in a cookie). */
export const SIDEBAR_COOKIE = "tracster_sidebar";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseSidebarCollapsed(value?: string): boolean {
  return value === "collapsed";
}

/** Client only: remember the choice and apply it right away (`data-sidebar` on <html>). */
export function applySidebarCollapsed(collapsed: boolean): void {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  if (collapsed) {
    document.documentElement.dataset.sidebar = "collapsed";
  } else {
    delete document.documentElement.dataset.sidebar;
  }
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavItem = {
  href: string;
  label: string;
};

const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "总览" },
  { href: "/analysis", label: "研究" },
  { href: "/runs", label: "运行" },
  { href: "/replay", label: "回放" },
  { href: "/config", label: "配置" },
];

/**
 * 按路径段判断导航是否激活，避免共享前缀导致的误高亮。
 */
function isNavItemActive(currentPathname: string, itemHref: string) {
  if (itemHref === "/") {
    return currentPathname === "/";
  }

  return currentPathname === itemHref || currentPathname.startsWith(`${itemHref}/`);
}

/**
 * 渲染应用级共享导航，并根据当前 pathname 高亮激活项。
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="flex flex-wrap items-center gap-2">
      {APP_NAV_ITEMS.map((item) => {
        // 使用路径段匹配当前路由，避免 /config-extra 误命中 /config。
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "rounded-md border px-3 py-1.5 text-sm transition",
              isActive
                ? "border-sky-400/50 bg-sky-400/15 text-sky-100"
                : "border-white/10 text-slate-300 hover:border-sky-400/30 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

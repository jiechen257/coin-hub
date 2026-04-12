import { redirect } from "next/navigation";

// 旧命令中心已迁移到首页总览，这个路由只保留兼容跳转，避免用户或书签落到旧入口。
export default function CommandCenterPage() {
  redirect("/");
}

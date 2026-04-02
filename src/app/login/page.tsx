import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/modules/auth/auth-service";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();

  if (isAuthenticated(cookieStore)) {
    redirect("/config");
  }

  const params = searchParams ? await searchParams : undefined;
  const hasError = params?.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-950/20 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
          单用户访问
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          登录 Coin Hub
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          输入单用户密码后进入受保护壳层。
        </p>
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">
              登录密码
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
              placeholder="请输入密码"
            />
          </label>
          {hasError ? (
            <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              密码不正确，请重试。
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            登录
          </button>
        </form>
      </section>
    </main>
  );
}

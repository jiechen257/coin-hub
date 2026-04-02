import { getConfigVersionData } from "@/modules/config/config-service";
import { ConfigEditor } from "@/components/config/config-editor";

export default async function ConfigPage() {
  const { currentVersion, versions } = await getConfigVersionData();

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            策略配置
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            配置版本管理
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            新版本会自动成为当前生效版本，历史版本保留可追溯记录，便于回滚和对比。
          </p>
        </header>

        <ConfigEditor currentVersion={currentVersion} versions={versions} />
      </section>
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ResearchDeskWorkspaceTab =
  | "active"
  | "records"
  | "archive"
  | "candidates";

type ResearchDeskMainTabsProps = {
  value: ResearchDeskWorkspaceTab;
  onValueChange: (value: ResearchDeskWorkspaceTab) => void;
  activePanel: ReactNode;
  recordsPanel: ReactNode;
  archivePanel: ReactNode;
  candidatesPanel: ReactNode;
};

export function ResearchDeskMainTabs({
  value,
  onValueChange,
  activePanel,
  recordsPanel,
  archivePanel,
  candidatesPanel,
}: ResearchDeskMainTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as ResearchDeskWorkspaceTab)
      }
      className="gap-4"
    >
      <TabsList className="grid h-auto w-full grid-cols-2 justify-start p-1 md:grid-cols-4">
        <TabsTrigger value="active">运行中</TabsTrigger>
        <TabsTrigger value="records">全部记录</TabsTrigger>
        <TabsTrigger value="archive">归档分析</TabsTrigger>
        <TabsTrigger value="candidates">候选策略</TabsTrigger>
      </TabsList>
      <TabsContent value="active">{activePanel}</TabsContent>
      <TabsContent value="records">{recordsPanel}</TabsContent>
      <TabsContent value="archive">{archivePanel}</TabsContent>
      <TabsContent value="candidates">{candidatesPanel}</TabsContent>
    </Tabs>
  );
}

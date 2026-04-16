"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CirclePlus, Loader2, Trash2, UserPlus } from "lucide-react";
import type {
  ResearchDeskSymbol,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TradePayload = {
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  marketContext?: string;
  triggerText: string;
  entryText: string;
  riskText?: string;
  exitText?: string;
  notes?: string;
};

type ViewPlanPayload = {
  label: string;
  side: "long" | "short";
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  marketContext?: string;
  triggerText: string;
  entryText: string;
  riskText?: string;
  exitText?: string;
  notes?: string;
};

export type CreateRecordRequest =
  | {
      traderId: string;
      symbol: ResearchDeskSymbol;
      recordType: "trade";
      sourceType: "manual";
      occurredAt: string;
      rawContent: string;
      notes?: string;
      trade: TradePayload;
      plans: [];
    }
  | {
      traderId: string;
      symbol: ResearchDeskSymbol;
      recordType: "view";
      sourceType: "manual";
      occurredAt: string;
      rawContent: string;
      notes?: string;
      plans: ViewPlanPayload[];
    };

type RecordFormProps = {
  traders: ResearchDeskTrader[];
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onRecordSaved?: () => void;
  onCancel?: () => void;
  variant?: "panel" | "dialog";
};

type ViewPlanFormState = {
  label: string;
  side: "long" | "short";
  marketContext: string;
  triggerText: string;
  entryText: string;
  riskText: string;
  exitText: string;
};

function toLocalDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function createEmptyViewPlan(index: number): ViewPlanFormState {
  return {
    label: `plan-${index + 1}`,
    side: "long",
    marketContext: "",
    triggerText: "",
    entryText: "",
    riskText: "",
    exitText: "",
  };
}

function FieldBlock({
  label,
  htmlFor,
  children,
  description,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function DirectionOption({
  id,
  value,
  checked,
  label,
  description,
}: {
  id: string;
  value: "long" | "short";
  checked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors",
        checked
          ? "border-primary/30 bg-primary/10"
          : "border-border/80 bg-secondary/30 hover:border-primary/20 hover:bg-accent/60",
      ].join(" ")}
    >
      <RadioGroupItem id={id} value={value} />
      <div className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </div>
    </label>
  );
}

export function RecordForm({
  traders,
  onCreateTrader,
  onCreateRecord,
  onRecordSaved,
  onCancel,
  variant = "panel",
}: RecordFormProps) {
  const [traderName, setTraderName] = useState("");
  const [selectedTraderId, setSelectedTraderId] = useState<string>("");
  const [symbol, setSymbol] = useState<ResearchDeskSymbol>("BTC");
  const [recordType, setRecordType] = useState<"trade" | "view">("trade");
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeValue());
  const [rawContent, setRawContent] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [tradeSide, setTradeSide] = useState<"long" | "short">("long");
  const [tradeMarketContext, setTradeMarketContext] = useState("");
  const [tradeTriggerText, setTradeTriggerText] = useState("");
  const [tradeEntryText, setTradeEntryText] = useState("");
  const [tradeRiskText, setTradeRiskText] = useState("");
  const [tradeExitText, setTradeExitText] = useState("");
  const [viewPlans, setViewPlans] = useState<ViewPlanFormState[]>([
    createEmptyViewPlan(0),
  ]);
  const [isCreatingTrader, setIsCreatingTrader] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const traderOptions = useMemo(() => traders, [traders]);

  useEffect(() => {
    if (!selectedTraderId && traderOptions[0]) {
      setSelectedTraderId(traderOptions[0].id);
    }

    if (
      selectedTraderId &&
      traderOptions.every((trader) => trader.id !== selectedTraderId)
    ) {
      setSelectedTraderId(traderOptions[0]?.id ?? "");
    }
  }, [selectedTraderId, traderOptions]);

  function updateViewPlan(index: number, patch: Partial<ViewPlanFormState>) {
    setViewPlans((current) =>
      current.map((plan, planIndex) =>
        planIndex === index ? { ...plan, ...patch } : plan,
      ),
    );
  }

  async function handleCreateTrader() {
    if (!traderName.trim()) {
      setError("先输入交易员名称");
      return;
    }

    setIsCreatingTrader(true);
    setError(null);
    setMessage(null);

    try {
      const trader = await onCreateTrader({
        name: traderName.trim(),
        platform: "manual",
      });
      setTraderName("");
      setSelectedTraderId(trader.id);
      setMessage(`已新增交易员 ${trader.name}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新增交易员失败");
    } finally {
      setIsCreatingTrader(false);
    }
  }

  function resetRecordForm() {
    setRawContent("");
    setEntryPrice("");
    setExitPrice("");
    setTradeSide("long");
    setTradeMarketContext("");
    setTradeTriggerText("");
    setTradeEntryText("");
    setTradeRiskText("");
    setTradeExitText("");
    setViewPlans([createEmptyViewPlan(0)]);
    setOccurredAt(toLocalDateTimeValue());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const traderId = selectedTraderId || traderOptions[0]?.id || "";

    if (!traderId) {
      setError("请先创建或选择交易员");
      return;
    }

    if (!rawContent.trim()) {
      setError("先补充原始记录");
      return;
    }

    if (recordType === "trade" && (!entryPrice || !exitPrice)) {
      setError("真实开单需要录入入场价和出场价");
      return;
    }

    if (
      recordType === "view" &&
      viewPlans.some(
        (plan) =>
          !plan.label.trim() || !plan.triggerText.trim() || !plan.entryText.trim(),
      )
    ) {
      setError("每个观点方案都需要标签、触发条件和入场条件");
      return;
    }

    setIsSavingRecord(true);
    setError(null);
    setMessage(null);

    try {
      if (recordType === "trade") {
        await onCreateRecord({
          traderId,
          symbol,
          recordType: "trade",
          sourceType: "manual",
          occurredAt: new Date(occurredAt).toISOString(),
          rawContent: rawContent.trim(),
          trade: {
            side: tradeSide,
            entryPrice: Number(entryPrice),
            exitPrice: Number(exitPrice),
            marketContext: tradeMarketContext || undefined,
            triggerText: tradeTriggerText || "copy trader fill",
            entryText: tradeEntryText || "copy trader fill",
            riskText: tradeRiskText || undefined,
            exitText: tradeExitText || "close with trader",
          },
          plans: [],
        });
      } else {
        await onCreateRecord({
          traderId,
          symbol,
          recordType: "view",
          sourceType: "manual",
          occurredAt: new Date(occurredAt).toISOString(),
          rawContent: rawContent.trim(),
          plans: viewPlans.map((plan) => ({
            label: plan.label.trim(),
            side: plan.side,
            marketContext: plan.marketContext || undefined,
            triggerText: plan.triggerText.trim(),
            entryText: plan.entryText.trim(),
            riskText: plan.riskText || undefined,
            exitText: plan.exitText || undefined,
          })),
        });
      }

      resetRecordForm();
      setMessage("记录已保存");
      onRecordSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存记录失败");
    } finally {
      setIsSavingRecord(false);
    }
  }

  const shellClassName =
    variant === "dialog"
      ? "space-y-6"
      : "rounded-lg border border-border/80 bg-card/95 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)]";

  return (
    <div className={shellClassName}>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {variant === "dialog" ? "Create Record" : "录入区"}
        </p>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {variant === "dialog" ? "记录创建器" : "记录流"}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            先选对象，再决定这是一笔真实开单还是一条行情观点。
          </p>
        </div>
      </div>

      {variant === "dialog" ? (
        <div className="grid gap-2 rounded-lg border border-border/80 bg-secondary/20 p-3 sm:grid-cols-4">
          {[
            "1. 选择交易员",
            "2. 切换记录类型",
            "3. 填原始记录",
            "4. 保存并回到浏览",
          ].map((step) => (
            <div
              key={step}
              className="rounded-md border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              {step}
            </div>
          ))}
        </div>
      ) : null}

      <Accordion type="single" collapsible className="rounded-lg border border-border/80 bg-secondary/20 px-4">
        <AccordionItem value="create-trader" className="border-b-0">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="grid gap-1 text-left">
              <span className="text-sm font-medium text-foreground">快速新增交易员</span>
              <span className="text-xs leading-5 text-muted-foreground">
                只有当前列表里没有目标人物时再展开。
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                aria-label="交易员名称"
                placeholder="输入交易员名称"
                value={traderName}
                onChange={(event) => setTraderName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateTrader}
                disabled={isCreatingTrader}
              >
                {isCreatingTrader ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isCreatingTrader ? "新增中..." : "新增交易员"}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FieldBlock label="选择交易员">
          <Select value={selectedTraderId} onValueChange={setSelectedTraderId}>
            <SelectTrigger>
              <SelectValue placeholder="请选择交易员" />
            </SelectTrigger>
            <SelectContent>
              {traderOptions.map((trader) => (
                <SelectItem key={trader.id} value={trader.id}>
                  {trader.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldBlock>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="资产">
            <Select value={symbol} onValueChange={(value) => setSymbol(value as ResearchDeskSymbol)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
              </SelectContent>
            </Select>
          </FieldBlock>

          <FieldBlock label="记录时间" htmlFor="occurred-at">
            <Input
              id="occurred-at"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </FieldBlock>
        </div>

        <Tabs
          value={recordType}
          onValueChange={(value) => setRecordType(value as "trade" | "view")}
          className="gap-5"
        >
          <div className="grid gap-2">
            <Label>记录类型</Label>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trade">真实开单</TabsTrigger>
              <TabsTrigger value="view">行情观点</TabsTrigger>
            </TabsList>
          </div>

          <FieldBlock
            label="原始记录"
            htmlFor="raw-content"
            description="先抓原始语句，页面的摘要卡和折叠结构会帮你自动做第二层整理。"
          >
            <Textarea
              id="raw-content"
              aria-label="原始记录"
              placeholder="输入当时的原始记录、截图摘要或执行说明"
              value={rawContent}
              onChange={(event) => setRawContent(event.target.value)}
              className="min-h-28"
            />
          </FieldBlock>

          <TabsContent value="trade" className="grid gap-5">
            <FieldBlock label="方向">
              <RadioGroup
                value={tradeSide}
                onValueChange={(value) => setTradeSide(value as "long" | "short")}
                className="grid gap-3 sm:grid-cols-2"
              >
                <DirectionOption
                  id="trade-side-long"
                  value="long"
                  checked={tradeSide === "long"}
                  label="多单"
                  description="顺着上行动能记录入场和离场。"
                />
                <DirectionOption
                  id="trade-side-short"
                  value="short"
                  checked={tradeSide === "short"}
                  label="空单"
                  description="顺着下行动能记录入场和离场。"
                />
              </RadioGroup>
            </FieldBlock>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock label="入场价" htmlFor="entry-price">
                <Input
                  id="entry-price"
                  aria-label="入场价"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如 82345.5"
                  value={entryPrice}
                  onChange={(event) => setEntryPrice(event.target.value)}
                />
              </FieldBlock>
              <FieldBlock label="出场价" htmlFor="exit-price">
                <Input
                  id="exit-price"
                  aria-label="出场价"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如 83510.2"
                  value={exitPrice}
                  onChange={(event) => setExitPrice(event.target.value)}
                />
              </FieldBlock>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock label="市场环境" htmlFor="trade-market-context">
                <Input
                  id="trade-market-context"
                  placeholder="趋势、结构、消息面"
                  value={tradeMarketContext}
                  onChange={(event) => setTradeMarketContext(event.target.value)}
                />
              </FieldBlock>
              <FieldBlock label="触发条件" htmlFor="trade-trigger-text">
                <Input
                  id="trade-trigger-text"
                  placeholder="触发入场的信号"
                  value={tradeTriggerText}
                  onChange={(event) => setTradeTriggerText(event.target.value)}
                />
              </FieldBlock>
            </div>

            <div className="grid gap-4">
              <FieldBlock label="入场逻辑" htmlFor="trade-entry-text">
                <Textarea
                  id="trade-entry-text"
                  className="min-h-20"
                  placeholder="为什么在这里进，仓位和确认条件是什么"
                  value={tradeEntryText}
                  onChange={(event) => setTradeEntryText(event.target.value)}
                />
              </FieldBlock>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldBlock label="风控思路" htmlFor="trade-risk-text">
                  <Textarea
                    id="trade-risk-text"
                    className="min-h-20"
                    placeholder="止损、无效条件、减仓逻辑"
                    value={tradeRiskText}
                    onChange={(event) => setTradeRiskText(event.target.value)}
                  />
                </FieldBlock>
                <FieldBlock label="离场计划" htmlFor="trade-exit-text">
                  <Textarea
                    id="trade-exit-text"
                    className="min-h-20"
                    placeholder="目标位、移动止损、退出条件"
                    value={tradeExitText}
                    onChange={(event) => setTradeExitText(event.target.value)}
                  />
                </FieldBlock>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view" className="grid gap-4">
            {viewPlans.map((plan, index) => (
              <div
                key={`${plan.label}-${index}`}
                className={cn(
                  "grid gap-4 rounded-lg border border-border/80 p-4",
                  variant === "dialog" ? "bg-secondary/20" : "bg-secondary/30",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      方案 {index + 1}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      把触发、入场、风控、离场拆开写，后面会折叠成结构化卡片。
                    </p>
                  </div>
                  {viewPlans.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setViewPlans((current) =>
                          current.filter((_, planIndex) => planIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="方案标签" htmlFor={`plan-label-${index}`}>
                    <Input
                      id={`plan-label-${index}`}
                      value={plan.label}
                      onChange={(event) =>
                        updateViewPlan(index, { label: event.target.value })
                      }
                    />
                  </FieldBlock>
                  <FieldBlock label="方向">
                    <Select
                      value={plan.side}
                      onValueChange={(value) =>
                        updateViewPlan(index, {
                          side: value as "long" | "short",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">long</SelectItem>
                        <SelectItem value="short">short</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="市场环境" htmlFor={`plan-market-context-${index}`}>
                    <Input
                      id={`plan-market-context-${index}`}
                      placeholder="趋势、结构、成交量"
                      value={plan.marketContext}
                      onChange={(event) =>
                        updateViewPlan(index, {
                          marketContext: event.target.value,
                        })
                      }
                    />
                  </FieldBlock>
                  <FieldBlock label="触发条件" htmlFor={`plan-trigger-${index}`}>
                    <Input
                      id={`plan-trigger-${index}`}
                      placeholder="计划触发点"
                      value={plan.triggerText}
                      onChange={(event) =>
                        updateViewPlan(index, {
                          triggerText: event.target.value,
                        })
                      }
                    />
                  </FieldBlock>
                </div>

                <FieldBlock label="入场条件" htmlFor={`plan-entry-${index}`}>
                  <Textarea
                    id={`plan-entry-${index}`}
                    className="min-h-20"
                    placeholder="确认条件、仓位、执行节奏"
                    value={plan.entryText}
                    onChange={(event) =>
                      updateViewPlan(index, {
                        entryText: event.target.value,
                      })
                    }
                  />
                </FieldBlock>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="风控条件" htmlFor={`plan-risk-${index}`}>
                    <Textarea
                      id={`plan-risk-${index}`}
                      className="min-h-20"
                      placeholder="无效条件、止损位、回撤容忍"
                      value={plan.riskText}
                      onChange={(event) =>
                        updateViewPlan(index, {
                          riskText: event.target.value,
                        })
                      }
                    />
                  </FieldBlock>
                  <FieldBlock label="离场条件" htmlFor={`plan-exit-${index}`}>
                    <Textarea
                      id={`plan-exit-${index}`}
                      className="min-h-20"
                      placeholder="止盈位、分批退出、结构破坏"
                      value={plan.exitText}
                      onChange={(event) =>
                        updateViewPlan(index, {
                          exitText: event.target.value,
                        })
                      }
                    />
                  </FieldBlock>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setViewPlans((current) => [
                  ...current,
                  createEmptyViewPlan(current.length),
                ])
              }
              className="w-full"
            >
              <CirclePlus className="h-4 w-4" />
              新增方案
            </Button>
          </TabsContent>
        </Tabs>

        <div
          className={cn(
            "space-y-3 border-t border-border/80 pt-4",
            variant === "dialog" &&
              "sticky bottom-0 z-10 -mx-1 rounded-t-lg bg-background/95 px-1 pb-1 backdrop-blur",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            {variant === "dialog" ? (
              <Button
                type="button"
                variant="outline"
                className="sm:w-36"
                onClick={onCancel}
              >
                取消
              </Button>
            ) : null}
            <Button type="submit" disabled={isSavingRecord} className="w-full">
              {isSavingRecord ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CirclePlus className="h-4 w-4" />
              )}
              {isSavingRecord ? "保存中..." : "保存记录"}
            </Button>
          </div>

          {message ? (
            <Alert variant="success">
              <AlertTitle>操作成功</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>提交失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </form>
    </div>
  );
}

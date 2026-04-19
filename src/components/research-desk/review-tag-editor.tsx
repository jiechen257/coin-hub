"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ResearchDeskReviewTagOption,
} from "@/components/research-desk/research-desk-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReviewTagEditorProps = {
  value: string[];
  options: ResearchDeskReviewTagOption[];
  onSave: (nextTags: string[]) => Promise<void>;
};

function normalizeTag(value: string) {
  return value.trim();
}

function sortTags(tags: string[], options: ResearchDeskReviewTagOption[]) {
  const optionOrder = new Map(
    options.map((option, index) => [option.label, index] as const),
  );

  return [...tags].sort((left, right) => {
    const leftIndex = optionOrder.get(left);
    const rightIndex = optionOrder.get(right);

    if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return left.localeCompare(right, "zh-Hans-CN");
  });
}

function buildInitialTags(
  value: string[],
  options: ResearchDeskReviewTagOption[],
) {
  return sortTags(
    value.filter((tag) => normalizeTag(tag).length > 0).map(normalizeTag),
    options,
  );
}

export function ReviewTagEditor({
  value,
  options,
  onSave,
}: ReviewTagEditorProps) {
  const [selectedTags, setSelectedTags] = useState(() =>
    buildInitialTags(value, options),
  );
  const [customTag, setCustomTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presetOptions = useMemo(
    () => options.filter((option) => option.kind === "preset"),
    [options],
  );

  useEffect(() => {
    setSelectedTags(buildInitialTags(value, options));
    setCustomTag("");
    setMessage(null);
    setError(null);
  }, [options, value]);

  function updateTags(nextTags: string[]) {
    setSelectedTags(sortTags(nextTags, options));
  }

  function toggleTag(label: string) {
    setMessage(null);
    setError(null);
    setSelectedTags((current) => {
      if (current.includes(label)) {
        return current.filter((tag) => tag !== label);
      }

      return sortTags([...current, label], options);
    });
  }

  function addCustomTag() {
    const nextTag = normalizeTag(customTag);

    if (nextTag.length === 0 || selectedTags.includes(nextTag)) {
      setCustomTag("");
      return;
    }

    updateTags([...selectedTags, nextTag]);
    setCustomTag("");
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await onSave(selectedTags);
      setMessage("标签已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "标签保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Review Tags</p>
        <div className="flex flex-wrap gap-2">
          {presetOptions.map((option) => {
            const active = selectedTags.includes(option.label);

            return (
              <Button
                key={option.label}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => toggleTag(option.label)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="review-tag-custom-input">自定义标签</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="review-tag-custom-input"
            value={customTag}
            onChange={(event) => setCustomTag(event.target.value)}
            placeholder="输入自定义标签"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomTag}
            disabled={normalizeTag(customTag).length === 0}
          >
            <Plus className="h-4 w-4" />
            添加标签
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          当前标签
        </p>
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-md px-2 py-1 text-xs"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  className="ml-2"
                  aria-label={`移除 ${tag}`}
                  onClick={() => toggleTag(tag)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            还没有添加 review tag。
          </p>
        )}
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "保存中..." : "保存标签"}
      </Button>
    </section>
  );
}

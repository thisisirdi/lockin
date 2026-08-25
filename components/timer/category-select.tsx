"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/lib/hooks/use-categories";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

export function CategorySelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
}) {
  const { categories, addCategory } = useCategories();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  if (creating) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          const category = await addCategory(newName.trim());
          onChange(category.id);
          setNewName("");
          setCreating(false);
        }}
      >
        <Input
          autoFocus
          placeholder="Category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={() => !newName && setCreating(false)}
          className="h-9 w-40"
        />
      </form>
    );
  }

  return (
    <Select
      value={value ?? "__none"}
      onValueChange={(v) => {
        if (v === "__new") {
          setCreating(true);
          return;
        }
        onChange(v === "__none" ? null : v);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">No category</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            {c.name}
          </SelectItem>
        ))}
        <SelectItem value="__new">
          <Plus className="h-3.5 w-3.5" /> New category
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

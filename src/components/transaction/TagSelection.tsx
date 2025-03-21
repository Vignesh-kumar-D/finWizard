// app/transactions/new/components/TagSelection.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionTag } from '@/types/transaction';

export function TagSelection({
  tags,
  selectedTags,
  setSelectedTags,
  onAddTag,
}: {
  tags: TransactionTag[];
  selectedTags: string[];
  setSelectedTags: (tagIds: string[]) => void;
  onAddTag: (name: string, color: string) => Promise<TransactionTag | null>;
}) {
  const [showAddTag, setShowAddTag] = useState<boolean>(false);
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#3b82f6');

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    const result = await onAddTag(newTagName, newTagColor);
    if (result) {
      setNewTagName('');
      setShowAddTag(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <FormLabel>Tags (Optional)</FormLabel>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAddTag(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Add New Tag
        </Button>
      </div>

      {/* Tag selection */}
      {!showAddTag ? (
        <Select
          onValueChange={(value) => {
            if (!selectedTags.includes(value)) {
              setSelectedTags([...selectedTags, value]);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select tags" />
          </SelectTrigger>
          <SelectContent>
            {tags
              .filter((tag) => !selectedTags.includes(tag.id))
              .map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-9 w-14 rounded border cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
            >
              Add Tag
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddTag(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Show selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          return tag ? (
            <Badge
              key={tagId}
              style={{ backgroundColor: tag.color }}
              className="text-white cursor-pointer"
              onClick={() =>
                setSelectedTags(selectedTags.filter((id) => id !== tagId))
              }
            >
              {tag.name} ✕
            </Badge>
          ) : null;
        })}
        {selectedTags.length === 0 && (
          <div className="text-sm text-muted-foreground">No tags selected</div>
        )}
      </div>
    </div>
  );
}

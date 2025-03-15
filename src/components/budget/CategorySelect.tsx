// components/budget/CategorySelect.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Category } from '@/types';
import { toast } from 'sonner';
import { createCategory } from '@/lib/firebase/utils/category';
import { useFirebase } from '@/lib/firebase/firebase-context';
import * as lucideIcons from 'lucide-react';
import { COLORS, ICON_NAMES } from '@/lib/constants';

// List of preset colors to choose from

// Get actual icon components from Lucide
const ICONS = ICON_NAMES.map((name) => ({
  name,
  component: lucideIcons[name],
}));

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  type: 'expense' | 'income' | 'investment';
  handleNewCategoryCreated: (categoryId: string) => Promise<void>;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  type,
  handleNewCategoryCreated,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { currentUser } = useFirebase();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form state for new category
  const [newCategory, setNewCategory] = useState<{
    name: string;
    color: string;
    icon: (typeof ICON_NAMES)[number];
    categoryType: 'expense' | 'income' | 'investment';
  }>({
    name: '',
    color: COLORS[0],
    icon: ICON_NAMES[0],
    categoryType: type, // Default to the passed type prop
  });

  // Set focus on the search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Get the selected category name
  const selectedCategory = categories.find((cat) => cat.id === value);

  // Filter categories based on search term and type
  const filteredCategories = categories.filter((cat) => {
    const matchesType =
      (type === 'expense' && cat.isExpense) ||
      (type === 'income' && cat.isIncome) ||
      (type === 'investment' && cat.isInvestment);

    const matchesSearch =
      search.trim() === '' ||
      cat.name.toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSearch;
  });

  // When dialog opens, update category type to match the current type filter
  useEffect(() => {
    if (dialogOpen) {
      setNewCategory((prev) => ({ ...prev, categoryType: type }));
    }
  }, [dialogOpen, type]);

  // Get icon component from name
  const getIconComponent = (iconName: string) => {
    const icon = ICONS.find((i) => i.name === iconName);
    if (icon && icon.component) {
      const IconComponent = icon.component;
      return <IconComponent className="h-4 w-4" />;
    }
    return null;
  };

  // Handle creating a new category
  const handleCreateCategory = async () => {
    if (!currentUser?.uid) return;
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setCreating(true);
    try {
      // Set category flags based on selected type
      const isExpense = newCategory.categoryType === 'expense';
      const isIncome = newCategory.categoryType === 'income';
      const isInvestment = newCategory.categoryType === 'investment';

      const categoryData = {
        userId: currentUser.uid,
        name: newCategory.name.trim(),
        color: newCategory.color,
        icon: newCategory.icon,
        isSystem: false, // Always false for user-created categories
        isIncome,
        isExpense,
        isInvestment,
      };

      const { id } = await createCategory(categoryData);
      await handleNewCategoryCreated(id);
      toast.success('Category created successfully');
      setDialogOpen(false);
      setOpen(false);

      // Reset form
      setNewCategory({
        name: '',
        color: COLORS[0],
        icon: ICON_NAMES[0],
        categoryType: type,
      });
    } catch (error) {
      toast.error('Failed to create category');
      console.error('Error creating category:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCategory ? (
              <div className="flex items-center">
                <div
                  className="w-5 h-5 rounded-full mr-2 flex items-center justify-center"
                  style={{ backgroundColor: selectedCategory.color }}
                >
                  {getIconComponent(selectedCategory.icon)}
                </div>
                <span className="truncate">{selectedCategory.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select category...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-3" align="start">
          {/* Search input */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category..."
              className="pl-8 pr-8"
            />
            {search && (
              <X
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setSearch('')}
              />
            )}
          </div>

          {/* Category list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-sm text-center text-muted-foreground mb-2">
                  No categories found
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    setNewCategory((prev) => ({ ...prev, name: search }));
                    setDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create &quot;{search}&quot;
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  {type.charAt(0).toUpperCase() + type.slice(1)} Categories
                </p>
                <div className="space-y-1">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      className={`
                        flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent
                        ${value === cat.id ? 'bg-accent' : ''}
                      `}
                      onClick={() => {
                        onChange(cat.id);
                        setOpen(false);
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full mr-2 flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: cat.color }}
                      >
                        {getIconComponent(cat.icon)}
                      </div>
                      <span className="truncate flex-1 text-left">
                        {cat.name}
                      </span>
                      {value === cat.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Create new category button */}
          <div className="border-t mt-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm font-normal"
              onClick={() => {
                setNewCategory((prev) => ({ ...prev, name: search }));
                setDialogOpen(true);
                setOpen(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new category
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog for creating a new category */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category for your budgets and transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="e.g., Groceries"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Category Type</Label>
              <RadioGroup
                value={newCategory.categoryType}
                onValueChange={(value) =>
                  setNewCategory({
                    ...newCategory,
                    categoryType: value as 'expense' | 'income' | 'investment',
                  })
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expense" id="expense" />
                  <Label htmlFor="expense">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="income" id="income" />
                  <Label htmlFor="income">Income</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="investment" id="investment" />
                  <Label htmlFor="investment">Investment</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full ${
                      newCategory.color === color
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                {ICONS.map(({ name, component: IconComponent }) => (
                  <button
                    key={name}
                    type="button"
                    className={`w-8 h-8 flex items-center justify-center rounded ${
                      newCategory.icon === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    onClick={() =>
                      setNewCategory({ ...newCategory, icon: name })
                    }
                    aria-label={`Select icon ${name}`}
                  >
                    {IconComponent && <IconComponent className="h-5 w-5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

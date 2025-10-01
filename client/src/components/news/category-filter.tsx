import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { value: 'all', label: 'All' },
  { value: 'politics', label: 'Politics' },
  { value: 'technology', label: 'Technology' },
  { value: 'sports', label: 'Sports' },
  { value: 'business', label: 'Business' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
];

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-foreground mb-4">Latest News</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? "default" : "secondary"}
            size="sm"
            onClick={() => onCategoryChange(category.value)}
            className="transition-all duration-200"
            data-testid={`button-category-${category.value}`}
          >
            {category.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

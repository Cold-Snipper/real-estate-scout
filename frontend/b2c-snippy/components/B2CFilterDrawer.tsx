"use client"

import { X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { LOCATIONS } from "../lib/listings-data"
import { LUXEMBOURG_COMMUNES } from "../lib/communes"

export interface B2CFilterState {
  locations: string[]
  communes: string[]
  priceMin: string
  priceMax: string
  bedrooms: string
  sqmMin: string
  sqmMax: string
  minScore: number
}

const defaultFilters: B2CFilterState = {
  locations: [],
  communes: [],
  priceMin: "",
  priceMax: "",
  bedrooms: "any",
  sqmMin: "",
  sqmMax: "",
  minScore: 6,
}

interface B2CFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: B2CFilterState
  onFiltersChange: (f: B2CFilterState) => void
  trigger?: React.ReactNode
}

export function B2CFilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: B2CFilterDrawerProps) {
  const toggleLocation = (loc: string) => {
    const next = filters.locations.includes(loc)
      ? filters.locations.filter((l) => l !== loc)
      : [...filters.locations, loc]
    onFiltersChange({ ...filters, locations: next })
  }
  const toggleCommune = (c: string) => {
    const next = filters.communes.includes(c)
      ? filters.communes.filter((x) => x !== c)
      : [...filters.communes, c]
    onFiltersChange({ ...filters, communes: next })
  }
  const hasActive =
    filters.locations.length > 0 ||
    filters.communes.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.bedrooms !== "any" ||
    filters.sqmMin !== "" ||
    filters.sqmMax !== "" ||
    filters.minScore !== 6

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Refine filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Locations (sample)</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.locations.length === 0 ? "All locations" : `${filters.locations.length} selected`}
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                {LOCATIONS.map((loc) => (
                  <label key={loc} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                    <Checkbox checked={filters.locations.includes(loc)} onCheckedChange={() => toggleLocation(loc)} />
                    {loc}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Communes (Luxembourg)</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {filters.communes.length === 0 ? "Any commune" : `${filters.communes.length} selected`}
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-h-60 w-64 overflow-y-auto p-2">
                {LUXEMBOURG_COMMUNES.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                    <Checkbox checked={filters.communes.includes(c)} onCheckedChange={() => toggleCommune(c)} />
                    {c}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Price range (€)</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceMin}
                onChange={(e) => onFiltersChange({ ...filters, priceMin: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.priceMax}
                onChange={(e) => onFiltersChange({ ...filters, priceMax: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Min match score</p>
            <Slider
              min={0}
              max={10}
              step={0.5}
              value={[filters.minScore]}
              onValueChange={([v]) => onFiltersChange({ ...filters, minScore: v })}
            />
            <span className="text-sm font-medium tabular-nums">{filters.minScore.toFixed(1)}</span>
          </div>
          {hasActive && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onFiltersChange(defaultFilters)}
            >
              <X className="size-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

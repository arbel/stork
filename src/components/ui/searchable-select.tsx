import * as React from "react"
import { useState, useEffect, useRef } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: React.ReactNode
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

interface SearchableSelectItemProps {
  value: string
  children: React.ReactNode
  searchText: string
  className?: string
}

const SearchableSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SearchableSelectItemProps
>(({ className, children, searchText, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SearchableSelectItem.displayName = "SearchableSelectItem"

const SearchableSelect = ({ value, onValueChange, placeholder, children, className, disabled }: SearchableSelectProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Clear search query after a delay
  useEffect(() => {
    if (searchQuery) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery("")
      }, 1000) // Clear after 1 second
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return

    const key = event.key.toLowerCase()
    
    // Only handle letter keys
    if (key.length === 1 && /[a-z]/.test(key)) {
      event.preventDefault()
      
      const newQuery = searchQuery + key
      setSearchQuery(newQuery)
      
      // Find and focus the first matching item
      const items = Array.from(document.querySelectorAll('[data-radix-select-item]'))
      const matchingItem = items.find(item => {
        const text = item.textContent?.toLowerCase() || ''
        return text.includes(newQuery)
      }) as HTMLElement

      if (matchingItem) {
        matchingItem.focus()
        // Scroll into view if needed
        matchingItem.scrollIntoView({ block: 'nearest' })
      }
    } else if (key === 'backspace' && searchQuery) {
      event.preventDefault()
      const newQuery = searchQuery.slice(0, -1)
      setSearchQuery(newQuery)
      
      if (newQuery) {
        // Re-search with shorter query
        const items = Array.from(document.querySelectorAll('[data-radix-select-item]'))
        const matchingItem = items.find(item => {
          const text = item.textContent?.toLowerCase() || ''
          return text.includes(newQuery)
        }) as HTMLElement

        if (matchingItem) {
          matchingItem.focus()
        }
      }
    }
  }

  return (
    <SelectPrimitive.Root 
      value={value} 
      onValueChange={onValueChange}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onKeyDown={handleKeyDown}
      >
        <SelectPrimitive.Value placeholder={typeof placeholder === 'string' ? placeholder : "Select..."}>
          {value && typeof placeholder !== 'string' ? placeholder : null}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          position="popper"
          onKeyDown={handleKeyDown}
        >
          <SelectPrimitive.Viewport className="p-1">
            {searchQuery && (
              <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                Searching: "{searchQuery}"
              </div>
            )}
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, { 
                  searchText: searchQuery 
                } as any)
              }
              return child
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { SearchableSelect, SearchableSelectItem }
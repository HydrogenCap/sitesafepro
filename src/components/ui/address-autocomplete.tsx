import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressSuggestion {
  place_id: number;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  id,
}: AddressAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      // Bias results towards UK for construction site context
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=gb&q=${encodeURIComponent(query)}`,
        {
          headers: {
            "Accept-Language": "en-GB",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        if (data.length > 0) {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Address search error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const formattedAddress = suggestion.display_name;
    setInputValue(formattedAddress);
    onChange(formattedAddress);
    setSuggestions([]);
    setOpen(false);
  };

  const formatShortAddress = (suggestion: AddressSuggestion) => {
    const parts = [];
    const addr = suggestion.address;
    
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`);
    } else if (addr.road) {
      parts.push(addr.road);
    }
    
    const locality = addr.city || addr.town || addr.village;
    if (locality) parts.push(locality);
    if (addr.postcode) parts.push(addr.postcode);
    
    return parts.length > 0 ? parts.join(", ") : suggestion.display_name.split(",").slice(0, 3).join(",");
  };

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            id={id}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No addresses found.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.place_id}
                  value={suggestion.display_name}
                  onSelect={() => handleSelectAddress(suggestion)}
                  className="cursor-pointer"
                >
                  <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {formatShortAddress(suggestion)}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {suggestion.display_name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

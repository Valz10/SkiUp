import React, { useEffect, useRef, useState } from "react";
import { searchPlaces } from "./lib/places.js";

export default function LocationInput({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  className = "account-input",
  maxLength = 120,
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    const currentRequest = ++requestId.current;
    if (query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError("");
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const places = await searchPlaces(query, controller.signal);
        if (requestId.current === currentRequest) setSuggestions(places);
      } catch (error) {
        if (error.name !== "AbortError" && requestId.current === currentRequest) {
          setSearchError("Location suggestions are temporarily unavailable. You can still enter any location.");
        }
      } finally {
        if (requestId.current === currentRequest) setSearching(false);
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  function choosePlace(place) {
    onChange(place.label);
    onSelect?.(place);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="location-input-wrap">
      <input
        id={id}
        className={className}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onSelect?.(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
      />
      {open && (searching || searchError || suggestions.length > 0) && (
        <div className="location-suggestions" id={`${id}-suggestions`} role="listbox">
          {searching && <span className="location-suggestion-status">Searching places…</span>}
          {suggestions.map((place) => (
            <button
              className="location-suggestion"
              type="button"
              role="option"
              aria-selected="false"
              key={`${place.latitude}-${place.longitude}-${place.label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choosePlace(place)}
            >
              <span>{place.label}</span>
              <small>{place.type.replaceAll("_", " ")}</small>
            </button>
          ))}
          {searchError && <span className="location-suggestion-status">{searchError}</span>}
          {suggestions.length > 0 && <span className="location-attribution">Place names © OpenStreetMap contributors</span>}
        </div>
      )}
      <span className="location-input-hint">Type any place name; suggestions are optional.</span>
    </div>
  );
}

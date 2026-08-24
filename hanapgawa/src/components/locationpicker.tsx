"use client";

import { REGIONS, citiesOfRegion } from "@/lib/psgc";
import { Field, Select } from "@/components/ui";

export function LocationPicker({
  regionCode,
  cityCode,
  onChange,
}: {
  regionCode: string;
  cityCode: string;
  onChange: (regionCode: string, cityCode: string) => void;
}) {
  const cities = regionCode ? citiesOfRegion(regionCode) : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Region">
        <Select
          value={regionCode}
          onChange={(e) => onChange(e.target.value, "")}
          required
        >
          <option value="">Piliin ang region…</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.short}</option>
          ))}
        </Select>
      </Field>
      <Field label="City / Lungsod">
        <Select
          value={cityCode}
          onChange={(e) => onChange(regionCode, e.target.value)}
          required
          disabled={!regionCode}
        >
          <option value="">{regionCode ? "Piliin ang city…" : "Region muna"}</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

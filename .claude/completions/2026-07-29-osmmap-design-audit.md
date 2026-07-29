# OSMMap Design Audit

## ORIGINAL
The OSMMap component uses Leaflet to display a map with site location, supplier markers, and routing. It currently uses semantic UI colors (destructive, muted, primary) for action buttons and popups. The map theme switches between light and dark based on the app theme via CartoDB basemaps. The component has no explicit concrete/flooring industry styling beyond the theme-aware basemap.

## EDITOR
Apply the concrete/flooring industry theme to the OSMMap component:
1. Replace semantic button colors with site office palette:
   - Replace `bg-destructive/15 border border-destructive/30 text-destructive` (Call button) with `bg-amber-600/15 border border-amber-600/30 text-amber-600` (amber for site-related actions)
   - Replace `bg-muted border border-border text-muted-foreground` (Website button) with `bg-stone-100/15 border border-stone-200/30 text-stone-800` (stone for informational actions)
   - Keep `bg-primary/15 border border-primary/30 text-primary` (Directions button) as primary represents core action (navigation to site)
2. Add subtle amber/stone accents to marker popups:
   - Popup background: `bg-stone-50 dark:bg-slate-800/50`
   - Popup border: `border border-stone-200 dark:border-slate-700`
   - Text colors: `text-stone-900 dark:text-white`
   - Accents: `border-t-2 border-amber-500` for section headers
3. Enhance marker icons to use site office colors:
   - Selected supplier marker: Use emerald pulse (`bg-emerald-500`)
   - Regular supplier markers: Use stone pulse (`bg-stone-500`)
   - Consider adding a site marker with amber pulse
4. Ensure route line uses site office colors:
   - Route line: `stroke-amber-500` for active route
5. Improve accessibility by ensuring sufficient contrast in popup elements

## CRITIC
- The changes maintain functionality while enhancing brand consistency.
- Color replacements preserve semantic meaning (destructive → amber for cautionary but actionable, muted → stone for neutral, primary → primary for core action).
- The map remains readable in both light and dark modes due to reliance on CSS variables and theme-aware classes.
- No breaking changes to component API or props.

## APPLY
- Update button classes in OSMMap.tsx as described.
- Add popup styling in the marker popup JSX.
- Adjust marker icon colors via createCustomMarkerIcon function parameters.
- Update route line color if applicable.
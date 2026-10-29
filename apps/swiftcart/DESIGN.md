# SwiftCart design

## World

A dense catalogue, not a poster. The product photograph is the only saturated thing on the page;
everything around it is quiet structure: hairline rules, small type, black controls. The reference
is a marketplace grid where browsing is the interaction, so the grid starts high and repeats.

## Palette

- Ground: white cards on near-white (#fafafa).
- Ink: neutral-900 for primary, neutral-600 for body, neutral-500 for meta.
- Rule: neutral-200 hairlines, never shadows for separation.
- Action: neutral-900 fill, white label. Secondary: neutral-100 fill.

## Type

Inter, self-hosted through next/font. Headings at 500-600 weight with tight tracking; body 14px.
Numbers in tables and prices use tabular figures so columns line up.

## Structure

Header carries brand, search, and auth. A second row carries navigation. The catalogue header is a
breadcrumb plus count, then a filter bar, then a four column grid, then pagination. A horizontal rail
follows. Fooer repeats navigation in columns.

## Browser surfaces

Selection, focus rings, scrollbars, and caret are themed from the ink palette rather than left at
defaults. Focus is a two pixel neutral-900 ring with an offset.

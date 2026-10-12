# OrbitalMesh Design Direction

Reading this as: university research demonstrator for technical audiences, in an editorial deep-space artifact style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Major Decisions

- Color: #0F0F11 and #17171B carry the editorial dark baseline; precious amber is reserved for active routing and warnings.
- Layout: the globe is the primary artifact; numbered scenario controls and a focused inspector replace a generic dashboard shell.
- Typography: Syne 800 is used for authored headlines; Space Grotesk is used for body copy; monospace is reserved for IDs, values, formulas, logs, and CSV-like data.
- Spacing: generous artifact framing around the globe contrasts with compact object data inside the inspector.
- Borders: thin high-contrast borders define instruments and controls without floating card treatment.
- Motion: satellite movement and route updates are functional simulation state; other interface motion is limited to hover and focus states.
- Buttons: controls shrink on hover and flip toward the amber accent instead of growing.
- Icons: icons label real tool groups and controls; telemetry values and computed results remain text-first.
- Stars: the background marks the space domain while staying faint enough not to compete with the simulator.
- Earth texture: generated surface, cloud, light, and grid layers provide geospatial context without external imagery or validation claims.

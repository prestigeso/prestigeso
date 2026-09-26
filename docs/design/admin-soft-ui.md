# PrestigeSO admin: soft white design

Approved direction: white-first surfaces, restrained slate accents, rounded panels, clear typography. Storefront is outside this change. Do not force a 16:9 canvas.

- Inter in admin only, system sans fallback; headings 27–36px, panel headings 19–21px, body 14px, secondary text at least 12px.
- White panels on pale neutral background; radius 26px desktop / 22px mobile, low-opacity shadow. Strong dark primary actions; selected navigation uses a subtle outline or pill.
- Navigation must wrap safely. Content uses min-width:0 and responsive columns, never clip meaningful labels. Interactive targets at least 44px; visible keyboard focus.
- Overview: four metrics, one selectable trend chart, recent paid store orders. No product-count filler or invented growth rates.
- Customers: two meaningful metrics, acquisition chart, then communication actions. Explain counting limitations in disclosure.
- Performance: one page title, grouped filters, task tabs, detailed reports. Measurement limitations remain accessible.
- Marketing: separate advertising readiness, Google results and campaigns. Provider data is not merged into a fabricated common metric.
- Finance: distinguish actual order contribution from price simulations. Missing costs remain unknown, not zero.
- Settings: descriptive sections for shipping/storefront, costs, connections and security. Retain drafts on navigation.
- Charts: real responsive SVG coordinates, readable ticks, keyboard/touch day selection and exact values. Missing dates break lines, zero stays zero. Comparison is disabled without previous data.
- Preserve empty, loading and error states. Never show demo numbers in production. Do not auto-trigger provider synchronization or alter authorization.

Shared implementations: OverviewSoft.module.css, StudioTrendChart.tsx, StudioWorkbench.module.css and AdminDesign.module.css.

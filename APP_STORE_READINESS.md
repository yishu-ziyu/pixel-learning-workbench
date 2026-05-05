# App Store Readiness Audit

## Objective

Use the local frontend/design/web-app building workflow to turn this project into a product that can credibly compete for App Store discovery and retention.

This document does not claim a top-10 ranking. It defines the concrete gates that must be true before that claim is even testable.

## Prompt-to-Artifact Checklist

| Requirement | Current artifact / evidence | Status |
| --- | --- | --- |
| Search relevant frontend/design/web-app skills | `tasks/todo.md` records `frontend-app-builder`, `react-best-practices`, `design-consultation`, and `design-review` review | Done |
| Establish design source of truth | `DESIGN.md` defines product context, visual system, layout rules, and app-readiness heuristics | Done |
| Make first-time product purpose clear | `apps/web/src/components/workbench.tsx` logged-out promise and one-click sample lesson | Done |
| Make logged-in UI action-led | Command bar, material readiness, executable empty states | Done |
| Verify core browser flow | Browser test: sample lesson opens, main task submits, progress moves from `1 / 13` to `2 / 13` | Done |
| Verify mobile task sequence | Browser test at `390px`: vertical flow and active-step fix | Done |
| Add app-like web metadata | `apps/web/src/app/manifest.ts`, `apps/web/public/icon.svg`, `layout.tsx` metadata | Done in this pass |
| Prepare App Store product-page strategy | This audit captures Apple product-page, optimization, and custom-page gates | Drafted |
| Native iOS packaging | No Xcode/iOS wrapper, bundle id, TestFlight build, or App Store Connect app record | Missing |
| App privacy and review package | No privacy nutrition label source, review notes, support URL, or App Review checklist | Missing |
| Store creative assets | No final icon variants, 6.7-inch screenshots, iPad screenshots, or app preview videos | Missing |
| Ranking/retention evidence | No analytics funnel, cohort retention, install conversion, or review-volume data | Missing |
| Real learning quality | Default provider is still heuristic, not a real model-backed learning engine | Missing |

## Apple-Specific Gates

- Product page: app name must be simple, memorable, distinctive, and up to 30 characters.
- Product page assets: App Store Connect supports up to 10 screenshots and 3 app previews per supported language.
- Product page optimization: test up to 3 alternate icons, screenshot sets, or previews against the default product page.
- Custom product pages: create up to 70 additional product pages, each with tailored screenshots, previews, promotional text, keywords, and a unique URL.
- Measurement: product page and custom page performance must be evaluated in App Analytics by impressions, downloads, conversion, and downstream value.

Sources:

- Apple Creating Your Product Page: https://developer.apple.com/app-store/product-page
- Apple Product Page Optimization: https://developer.apple.com/app-store/product-page-optimization/
- Apple Product Page Optimization Help: https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization/
- Apple Custom Product Pages: https://developer.apple.com/app-store/custom-product-pages/
- Apple Custom Product Pages Analytics: https://developer.apple.com/help/app-store-connect-analytics/acquisition/custom-product-pages/

## Next Build Gates

1. Create native distribution path: Expo/React Native wrapper or iOS shell, bundle id, TestFlight build.
2. Add measurement: first-run sample start, material parsed, path generated, first activity completed, D+1 review completed.
3. Add quality gate: real model provider with deterministic fallback and before/after lesson-quality eval set.
4. Create store assets: icon, product subtitle, keyword set, screenshot script, app preview script, and three product-page variants.
5. Add privacy/review package: privacy data map, support URL, review account, demo content, and App Review notes.

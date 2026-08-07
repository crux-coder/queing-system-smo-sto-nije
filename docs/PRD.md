# Samo Što Nije — MVP Product Requirements Document

## Problem Statement

Fast-food locations need a low-friction way to record incoming orders and tell customers when their food is ready without making staff operate a full point-of-sale system. Existing queue systems often require structured menus, payments, printers, customer accounts, or complicated staff workflows. Those features create unnecessary setup and interaction for an initial pilot.

Staff need to create an order from a short free-text description, move it through a minimal lifecycle, and show the customer a QR code. Customers need to scan that QR code without creating an account, see only their own order, understand roughly how many orders are ahead of them, and trust that the information is current.

## Solution

Samo Što Nije is a mobile-first Bosnian-language web application for one fast-food location per business account. A manually provisioned staff account opens a single operational dashboard where staff can create an order, show or reopen its QR code, edit it while ordered, mark it ready, and mark it collected. The oldest ordered item is always presented prominently as the next order.

Every order receives a short daily public number and an unguessable tracking URL encoded as a QR code. The customer page displays the location, the customer's own order, its progress, and an estimate of how many ordered items are ahead. It does not display other orders. Supabase Realtime keeps staff and customer views synchronized, with polling and pull-to-refresh as recovery mechanisms.

The application intentionally excludes menu management, payment processing, printer integration, customer identity, and chain administration. Its purpose is to validate the smallest useful queue-management workflow.

## User Stories

1. As a location owner, I want one account to represent one location, so that the pilot has no chain-administration overhead.
2. As a location owner, I want to provision the location account manually, so that the MVP does not require public registration.
3. As a staff member, I want to sign in with the location's shared email and password, so that I can access its queue.
4. As a staff member, I want my authenticated session to persist, so that I do not repeatedly sign in during service.
5. As a staff member, I want a clear logout action, so that I can end access on a shared device.
6. As a staff member, I want the dashboard to be designed for a phone first, so that I can operate it comfortably at the counter.
7. As a staff member, I want one prominent order-entry field, so that creating an order is the dashboard's obvious primary action.
8. As a staff member, I want to enter an order as unstructured text, so that I do not have to configure a menu or item catalog.
9. As a staff member, I want to enter up to 500 characters across multiple lines, so that practical order details fit without structured fields.
10. As a staff member, I want empty or whitespace-only orders rejected, so that accidental blank orders are not created.
11. As a staff member, I want a visible create button on mobile, so that a newline does not accidentally submit the order.
12. As a desktop staff member, I want to create an order with Control/Command plus Enter, so that keyboard operation remains fast.
13. As a staff member, I want the create action disabled while its request is pending, so that repeated taps do not create duplicate orders.
14. As a staff member, I want each successful creation to produce exactly one order, so that network retries cannot duplicate it.
15. As a staff member, I want a newly created order's number and QR code displayed immediately, so that the customer can scan it at the counter.
16. As a staff member, I want the QR dialog to remain open until I dismiss it, so that customers have enough time to scan.
17. As a staff member, I want to reopen an active order's QR code from its row, so that a customer can recover from a missed or failed scan.
18. As a staff member, I want the oldest ordered item displayed as a large next-order card, so that the kitchen's default priority is obvious.
19. As a staff member, I want all other active orders in one compact list, so that the dashboard remains usable on a phone.
20. As a staff member, I want the active list sorted by creation time with the oldest first, so that its order stays stable as statuses change.
21. As a staff member, I want ready orders to remain visible in the active list, so that I can mark them collected.
22. As a staff member, I want collected, cancelled, and expired orders removed from the operational list, so that only actionable work remains.
23. As a staff member, I want compact rows to show at most two lines of description, so that many orders remain scannable.
24. As a staff member, I want the featured next-order card to show the complete description, so that the kitchen can read it without another tap.
25. As a staff member, I want a dedicated edit button beside the QR button, so that editing and cancellation are clearly separated from status actions.
26. As a staff member, I want to edit and explicitly save an ordered item's text, so that I can correct it before preparation finishes.
27. As a staff member, I want the visible ready action to update the order immediately without opening a dialog, so that the kitchen workflow takes one tap.
28. As a staff member, I want to mark an ordered item ready, so that the customer is notified through the live tracking page.
29. As a staff member, I want to cancel an item only while it is ordered, so that the exceptional action is available without complicating later states.
30. As a staff member, I want a ready item's dialog to offer only marking it collected, so that its next action is unambiguous.
31. As a staff member, I want orders to be completed out of sequence when necessary, so that the software does not override kitchen reality.
32. As a staff member, I want multiple signed-in devices to see the same current queue, so that workers do not operate conflicting lists.
33. As a staff member, I want writes disabled with a clear offline message when the connection is unavailable, so that the UI never pretends an update succeeded.
34. As a location owner, I want the location's display name configured manually, so that customers know which queue they are viewing.
35. As a location owner, I want lifecycle timestamps retained, so that future preparation-time reporting remains possible.
36. As a location owner, I want order records retained indefinitely in the MVP, so that no deletion automation is required yet.
37. As a location owner, I want forgotten active orders to expire after 24 hours, so that stale work cannot remain in the live queue forever.
38. As a customer, I want to scan a QR code without signing in, so that tracking begins immediately.
39. As a customer, I want the tracking URL to be difficult to guess, so that my specific order is not trivially discoverable from its short number.
40. As a customer, I want to see the location display name, so that I can confirm I scanned the correct queue.
41. As a customer, I want my order number and status shown prominently, so that I can understand my current state at a glance.
42. As a customer, I want the tracking page to show only my order, so that other customers' order numbers do not distract from my progress.
43. As a customer, I want an estimate of how many ordered items are ahead of mine, so that I have a useful expectation without being promised strict processing order.
44. As a customer, I want the estimate to ignore ready, collected, cancelled, and expired items, so that it reflects outstanding preparation work.
45. As a customer, I want the number ahead shown prominently, so that I can understand my approximate position without seeing the queue.
46. As a customer, I want the page to explain when no orders are ahead, so that I know I am next for preparation.
47. As a customer, I do not want other customers' order numbers or statuses displayed, so that the page remains focused on my order.
48. As a customer, I want my open page to update through Realtime, so that I do not need to refresh continuously.
49. As a customer, I want a strong visual ready state and vibration where supported, so that I notice when my order becomes ready.
50. As a customer, I want to see when my device last synchronized successfully, so that I can judge whether the queue is fresh.
51. As a customer, I want the last-synced timestamp updated after initial load, Realtime events, polling, and manual refresh, so that it represents device freshness rather than the last business action.
52. As a customer, I want a visible disconnected or stale state, so that old information is never presented as current.
53. As a customer, I want active tracking to reconcile every 10 seconds even when Realtime is connected, so that terminal changes that remove the public queue row cannot be missed.
54. As a customer, I want to pull to refresh, so that I can request a current snapshot immediately.
55. As a customer, I want a collected tracking link to show that the order was collected, so that an old link has a clear terminal result.
56. As a customer, I want a cancelled tracking link to tell me the order was cancelled and to speak to staff, so that disappearance from the queue is explained.
57. As a customer, I want an expired tracking link to say that the order is no longer active, so that a stale link does not look broken.
58. As a customer, I want terminal tracking pages not to expose the current active queue, so that an old order link is scoped to its final result.
59. As a location owner, I want anonymous clients prevented from creating or changing orders, so that public tracking access cannot manipulate operations.
60. As a location owner, I want descriptions and tracking tokens excluded from public Realtime data, so that only accepted anonymous operational data is observable.
61. As a location owner, I want staff access restricted to their own location, so that one account cannot read or mutate another location's private orders.
62. As a product operator, I want no application-enforced limits on orders, locations, or tracking sessions, so that pilot usage is not artificially blocked.
63. As a product operator, I want infrastructure capacity treated as measurable rather than infinitely guaranteed, so that scaling decisions follow real usage.
64. As a product operator, I want Railway and Supabase logs available, so that MVP failures can be investigated without another monitoring vendor.
65. As a user, I want the interface written in Bosnian Latin script, so that operational and customer copy fits the pilot market.
66. As a user, I want a modern, light, high-contrast interface with large touch targets, so that the application feels polished and remains easy to operate.
67. As a user relying on assistive cues, I want every status communicated with text as well as color, so that status does not depend on color perception.

## Implementation Decisions

- The product and displayed brand name is **Samo Što Nije**.
- The application is a responsive Next.js web application hosted on Railway. It is not a native application and does not promise offline-capable PWA behavior.
- Supabase provides Postgres, email/password Auth, and Realtime. Current Supabase documentation and changelog must be checked before implementation because its APIs and recommended authorization patterns change over time.
- daisyUI from [daisyui.com](https://daisyui.com) is the component library and primary styling system. Tailwind utilities may support responsive layout and small composition adjustments, but implementations should prefer daisyUI components and theme tokens over bespoke primitives and one-off visual systems.
- The interface is mobile-first, modern, light-only, high-contrast, and uses large touch targets. Status always has a textual label in addition to color.
- All product copy is Bosnian Latin script. Copy should be centralized so localization can be added later, but the MVP has no language switcher.
- One authenticated account maps to exactly one location. Accounts and their location record are provisioned manually. There is no registration, invitation, password-reset, location-switching, role, or team-management flow.
- The root route redirects authenticated staff to the dashboard and unauthenticated visitors to login. There is no marketing homepage. QR tracking is the only public product experience.
- A location has one manually configured display name. There is no location settings or branding interface.
- The canonical order statuses are `ordered`, `ready`, `collected`, `cancelled`, and `expired`.
- Valid staff transitions are `ordered -> ready`, `ordered -> cancelled`, and `ready -> collected`. A scheduled system transition changes any still-active order to `expired` 24 hours after creation.
- Invalid or stale transitions must fail safely. Concurrent staff actions must be conditional on the expected current status so that two devices cannot apply contradictory transitions.
- An order stores a UUID, location ownership, daily sequence information, public order number, staff-only description, lifecycle status, unguessable tracking credential, and lifecycle timestamps.
- Required lifecycle timestamps are creation, latest update, ready, collected, cancelled, and expiry times. A timestamp that does not apply remains empty.
- Database timestamps are stored in UTC and formatted in each browser's local time. There is no stored location timezone.
- Public numbers are allocated atomically per location and UTC calendar date. A database uniqueness constraint must prevent two orders from receiving the same location/date/sequence combination.
- Monday through Sunday map to prefixes `A` through `G`, evaluated using the UTC day. The numeric portion starts at `001` each UTC day, uses three digits as minimum padding, and grows beyond 999 without a ceiling.
- Daily numbers are never reused, including after cancellation, expiry, or failed downstream display of the QR code.
- Creation accepts one required multiline description. Input is trimmed, empty content is rejected, and accepted content is capped at 500 characters.
- Mobile creation uses an explicit button. Control/Command plus Enter is a desktop shortcut; plain Enter remains available for line breaks.
- Creation must be idempotent. The client disables repeated submission while pending, and the server must protect against duplicate retries.
- Successful creation returns the public order number and tracking URL needed to render the QR dialog. The dialog does not close automatically.
- Each ordered item has a dedicated edit affordance beside its QR affordance. Compact ordered rows also have a direct ready action, while ready rows have a dedicated collection affordance.
- The dashboard has one featured next-order card and one compact active list. The featured item is the oldest order whose status is `ordered`. If no ordered item exists, the featured area communicates that no order is waiting.
- The remaining active list contains ordered and ready items and is sorted by creation time ascending. Status updates do not reorder it; collected, cancelled, and expired items leave it.
- The featured card shows the complete description. Compact rows clamp it to two lines. The ordered action dialog shows the complete editable value.
- The ordered dialog offers explicit save and cancel operations. Mark-ready buttons update immediately without opening a dialog. The ready dialog offers only mark collected. No Undo banner or extra confirmation step is required.
- There is no staff history screen. Terminal orders remain in the database and are accessible only through authorized backend operations or their scoped tracking result.
- Each tracking URL contains a cryptographically strong, unguessable credential rather than using the short public number as authorization. Token validation is performed server-side.
- Initial token validation identifies the tracked order and its location. Active pages use the sanitized location queue internally to calculate the estimate and reconcile live changes, but do not render other orders.
- Public queue data is structurally isolated from private order data. The anonymous Realtime representation may contain only the public-safe order identifier, public order number, location's public identifier, status, creation time, and ready time. It must never contain descriptions, tracking credentials, authentication identifiers, or privileged metadata.
- Anonymous access is read-only. Row Level Security and database grants deny all anonymous inserts, updates, and deletes. Authenticated staff policies include location ownership checks rather than relying on the authenticated role alone.
- Public queue activity is intentionally treated as observable in the MVP. The accepted risk is that a third party may infer location volume, rush periods, and approximate preparation speed.
- Both staff and active customer pages use Supabase Realtime. Realtime events trigger a canonical refetch or otherwise reconcile against a server-authoritative snapshot rather than blindly trusting partial local state.
- Active customer pages listen for sanitized unfiltered public-queue delete events and locally match the deleted order ID so terminal transitions refresh immediately; they also reconcile every 10 seconds because filtered Realtime subscriptions cannot deliver deletes and events can be missed. When Realtime disconnects, clients additionally enter a visible degraded state, allow manual pull-to-refresh, and attempt to restore the subscription.
- `Last synced` means the latest successful device synchronization. It updates after the initial snapshot, a successfully reconciled Realtime event, a successful fallback poll, or a successful manual refresh.
- The customer page has one large personal-order card with Aura progress, a prominent count of ordered items ahead, and connection/freshness information. It does not render ready or ordered lists.
- The queue-ahead estimate counts currently `ordered` items at the same location whose creation ordering precedes the tracked order. The UI presents this as an estimate because preparation may complete out of sequence.
- The internal queue-ahead calculation uses creation ordering with deterministic UUID tie-breaking when timestamps are equal.
- A terminal tracking link remains valid indefinitely. Collected, cancelled, and expired pages show the corresponding final state but do not show the location's current active queue.
- Customer readiness feedback is visual and attempts a short vibration where the browser supports it. The MVP does not use sound, browser push, SMS, email, or other notifications.
- Staff writes are online-only. When connectivity is unavailable or not confirmed, creation and state-changing actions are disabled and the reason is visible.
- There are no application-enforced limits on locations, orders, or subscribers. This is not an unlimited-capacity guarantee; actual Railway and Supabase usage must be observed and infrastructure scaled when needed.
- Supported browsers are current mobile Safari and Chrome and current desktop Chrome, Safari, Firefox, and Edge. Legacy browsers and embedded in-app browsers receive only graceful fallback where practical.
- The MVP has local development and one production environment. It has no dedicated staging environment.
- Operational diagnosis uses Railway application logs and Supabase logs. Third-party analytics and error tracking are not included.

## Testing Decisions

- Tests assert externally visible behavior and security contracts rather than component internals, hook implementation, CSS class structure, or database implementation details.
- The highest-value seam is one browser-level journey covering staff login, order creation, QR/tracking navigation, the customer's private progress and count-ahead view, marking ready, Realtime customer change, and marking collected. This proves the main product outcome across the real boundaries.
- Pure domain tests cover UTC weekday prefixes, daily counter behavior, minimum number padding and values beyond 999, no number reuse, queue ordering, queue-ahead estimates, 24-hour expiry, and permitted/forbidden status transitions.
- Database contract tests prove atomic number allocation under concurrency and verify lifecycle timestamps and terminal-state behavior.
- Authorization tests prove that an unauthenticated user can read only the sanitized queue representation, cannot read descriptions or tracking credentials, and cannot perform any write.
- Authorization tests prove that authenticated staff can read and mutate only the location mapped to their account.
- Realtime tests prove that only public-safe fields can reach anonymous subscribers and that staff/customer views reconcile to the canonical state after a change.
- Resilience tests cover immediate matched-delete handling, connected-state terminal reconciliation, a disconnected Realtime channel, visible degraded state, 10-second polling, successful reconnection, manual refresh, and correct last-synced semantics.
- Interaction tests cover input trimming, empty and over-limit validation, double-submit prevention, QR reopening, explicit edit saving, direct mark-ready without a dialog, ready-to-collected behavior, and disabled writes while offline.
- Accessibility verification covers keyboard operation on desktop, touch-target sizing on mobile, status text independent of color, focus management in dialogs, and readable contrast in the light theme.
- The repository currently contains no established product test suite or comparable feature tests. The implementation should add the smallest test harness that supports these three principal seams: pure domain behavior, database/RLS contracts, and the end-to-end browser journey.

## Out of Scope

- Public self-registration, invitations, password-reset UI, account recovery UI, staff accounts, staff roles, and permissions management.
- Multiple locations under one account, location switching, chain administration, and cross-location dashboards.
- Menu or catalog management, structured line items, modifiers, quantities, inventory, pricing, taxes, discounts, payments, refunds, and receipts.
- Printer or point-of-sale integration and printed QR codes.
- Customer accounts, customer names, phone numbers, payment data, or other customer identity features.
- SMS, email, browser push, native push, and guaranteed audible alerts.
- A marketing homepage, public location discovery, configurable public boards, or kiosk mode.
- Staff history, search, reporting, analytics dashboards, service-time metrics, exports, and audit-log UI.
- Logo uploads, custom themes, custom status colors, location-address management, or any branding/settings UI.
- Editing ready or terminal orders, cancelling ready orders, restoring terminal orders, or reusing order numbers.
- Offline order creation, queued offline mutations, and conflict resolution after reconnecting.
- Native iOS or Android applications and an offline-capable PWA.
- Automatic data deletion or a configurable retention policy.
- A staging environment, third-party product analytics, and third-party error tracking.
- Legacy-browser optimization and formal support for embedded in-app browsers.
- Contractual capacity or performance guarantees at arbitrary scale.

## Further Notes

- The public/private data split is a core security boundary, even though customer identities are not collected. Public operational data may be acceptable, but staff descriptions and write capabilities are not public.
- Free-text descriptions may contain sensitive information entered by staff. They remain staff-only, but the MVP intentionally includes neither a personal-data warning nor automatic deletion.
- Repeated `A–G` prefixes and daily sequences are safe because internal UUIDs, UTC dates, and tracking credentials remain authoritative. Staff and customer experiences use short numbers only as display identifiers.
- The counter resets at midnight UTC by explicit product decision, even when that differs from the location's local midnight.
- Implementers must consult the installed Next.js 16 documentation before writing framework code, as required by repository guidance.
- Implementers must consult current daisyUI documentation before creating UI components and should use daisyUI as the default component and styling vocabulary.
- Before implementing Supabase schema, Auth, RLS, Realtime, or scheduled expiry, review the current Supabase changelog and official documentation. Every exposed table must use RLS, and public database privileges must be limited to the minimum required read-only surface.

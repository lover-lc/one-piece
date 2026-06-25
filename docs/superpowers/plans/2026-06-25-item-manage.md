# 物品整理 App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 + Phase 2 of the iOS item management app (SwiftUI + SwiftData) per `docs/superpowers/specs/2026-06-25-item-manage-design.md`.

**Architecture:** Simplified MVVM — SwiftData `@Model` entities, `@Query` in views, extracted utilities for cost/date logic and sort options, SearchViewModel for search state. TabView shell with three tabs.

**Tech Stack:** SwiftUI, SwiftData, iOS 17+, XCTest (unit), XCUITest (optional UI)

**Spec:** `docs/superpowers/specs/2026-06-25-item-manage-design.md`
**Bundle ID:** `com.wind.ItemManage`
**Remote:** `https://gitee.com/WLL1011/item-manage`

---

## File Map

| Path | Responsibility |
|------|----------------|
| `ItemManage/App/ItemManageApp.swift` | App entry, ModelContainer, onboarding gate |
| `ItemManage/Models/Area.swift` | Area entity + `isSystemReserved` |
| `ItemManage/Models/Item.swift` | Item entity + computed status/cost |
| `ItemManage/Models/ModelContainer.swift` | Container factory + seed preset areas |
| `ItemManage/Utilities/ItemCostCalculator.swift` | Pure functions: usedDays, dailyCost |
| `ItemManage/Utilities/ItemSortOption.swift` | Sort field + direction enums |
| `ItemManage/Utilities/ItemStatus.swift` | Status priority: usedUp > expired > expiringSoon |
| `ItemManage/ViewModels/SearchViewModel.swift` | Search filter + sort |
| `ItemManage/Views/ContentView.swift` | TabView root |
| `ItemManage/Views/ItemListView.swift` | Grouped list, filter, sort, refresh |
| `ItemManage/Views/ItemRowView.swift` | Single item card |
| `ItemManage/Views/ItemDetailView.swift` | Detail + mark used up + delete |
| `ItemManage/Views/ItemFormView.swift` | Add/edit form + validation |
| `ItemManage/Views/AreaManageView.swift` | CRUD areas + delete dialog |
| `ItemManage/Views/SearchView.swift` | Search UI |
| `ItemManage/Views/OnboardingView.swift` | Multi-page intro |
| `ItemManage/Views/DeleteAreaSheet.swift` | Delete area 3-way choice |
| `ItemManageTests/ItemCostCalculatorTests.swift` | Unit tests |
| `ItemManageTests/ItemValidationTests.swift` | Validation tests |

---

### Task 1: Xcode Project Scaffold

**Files:**
- Create: Xcode project `ItemManage.xcodeproj` (iOS App template)
- Create: `ItemManage/App/ItemManageApp.swift`
- Create: `ItemManage/Assets.xcassets`
- Create: `.gitignore` (already exists)

- [ ] **Step 1: Create Xcode project**

In Xcode (or instruct user if CLI unavailable):
1. File → New → Project → iOS → App
2. Product Name: `ItemManage`
3. Team: (your team)
4. Organization Identifier: `com.wind`
5. Bundle Identifier: `com.wind.ItemManage`
6. Interface: SwiftUI
7. Storage: SwiftData ✓
8. Include Tests: ✓
9. Save into repo root: `/Users/wind/Documents/Project/P_WorkSpace/item-manage/`
10. Deployment Target: iOS 17.0

- [ ] **Step 2: Reorganize groups to match spec**

Create groups/folders: `App`, `Models`, `Views`, `ViewModels`, `Utilities`. Move default `ContentView.swift` to `Views/`.

- [ ] **Step 3: Minimal app entry**

```swift
// ItemManage/App/ItemManageApp.swift
import SwiftUI
import SwiftData

@main
struct ItemManageApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Area.self, Item.self])
    }
}
```

```swift
// ItemManage/Views/ContentView.swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        Text("ItemManage")
    }
}
```

- [ ] **Step 4: Build**

Run: `xcodebuild -scheme ItemManage -destination 'platform=iOS Simulator,name=iPhone 16' build`
Expected: BUILD SUCCEEDED

- [ ] **Step 5: Commit**

```bash
git add ItemManage.xcodeproj ItemManage/ ItemManageTests/ .gitignore
git commit -m "chore: scaffold Xcode project for ItemManage"
```

---

### Task 2: ItemCostCalculator (TDD)

**Files:**
- Create: `ItemManage/Utilities/ItemCostCalculator.swift`
- Create: `ItemManageTests/ItemCostCalculatorTests.swift`

- [ ] **Step 1: Write failing tests**

```swift
// ItemManageTests/ItemCostCalculatorTests.swift
import XCTest
@testable import ItemManage

final class ItemCostCalculatorTests: XCTestCase {
    let calendar = Calendar.current

    func testUsedDaysSameDayReturnsOne() {
        let date = Date()
        XCTAssertEqual(ItemCostCalculator.usedDays(from: date, to: date, calendar: calendar), 1)
    }

    func testUsedDaysAcrossDays() {
        var comps = DateComponents()
        comps.year = 2026; comps.month = 6; comps.day = 1
        let start = calendar.date(from: comps)!
        comps.day = 10
        let end = calendar.date(from: comps)!
        XCTAssertEqual(ItemCostCalculator.usedDays(from: start, to: end, calendar: calendar), 9)
    }

    func testDailyCostZeroPrice() {
        let cost = ItemCostCalculator.dailyCost(price: 0, usedDays: 5)
        XCTAssertEqual(cost, 0)
    }

    func testDailyCostNormal() {
        let cost = ItemCostCalculator.dailyCost(price: 100, usedDays: 4)
        XCTAssertEqual(cost, Decimal(string: "25")!)
    }

    func testDailyCostSameDayPurchase() {
        let cost = ItemCostCalculator.dailyCost(price: 50, usedDays: 1)
        XCTAssertEqual(cost, Decimal(string: "50")!)
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `xcodebuild test -scheme ItemManage -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:ItemManageTests/ItemCostCalculatorTests`
Expected: FAIL — `ItemCostCalculator` not found

- [ ] **Step 3: Implement**

```swift
// ItemManage/Utilities/ItemCostCalculator.swift
import Foundation

enum ItemCostCalculator {
    static func usedDays(from start: Date, to end: Date, calendar: Calendar = .current) -> Int {
        let startDay = calendar.startOfDay(for: start)
        let endDay = calendar.startOfDay(for: end)
        let days = calendar.dateComponents([.day], from: startDay, to: endDay).day ?? 0
        return max(days, 0) + 1  // inclusive; same day = 1
    }

    static func dailyCost(price: Decimal, usedDays: Int) -> Decimal {
        guard usedDays > 0 else { return 0 }
        if price == 0 { return 0 }
        var result = price / Decimal(usedDays)
        var rounded = Decimal()
        NSDecimalRound(&rounded, &result, 2, .plain)
        return rounded
    }

    static func formatDailyCost(_ cost: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "¥"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return (formatter.string(from: cost as NSDecimalNumber) ?? "¥0.00") + "/天"
    }
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add ItemManage/Utilities/ ItemManageTests/
git commit -m "feat: add ItemCostCalculator with unit tests"
```

---

### Task 3: SwiftData Models

**Files:**
- Create: `ItemManage/Models/Area.swift`
- Create: `ItemManage/Models/Item.swift`
- Create: `ItemManage/Utilities/ItemStatus.swift`

- [ ] **Step 1: Area model**

```swift
// ItemManage/Models/Area.swift
import Foundation
import SwiftData

@Model
final class Area {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    var isSystemReserved: Bool
    @Relationship(deleteRule: .nullify, inverse: \Item.area)
    var items: [Item] = []

    init(name: String, isSystemReserved: Bool = false) {
        self.id = UUID()
        self.name = name
        self.createdAt = Date()
        self.isSystemReserved = isSystemReserved
    }

    static let uncategorizedName = "未分类"
}
```

- [ ] **Step 2: Item model with computed properties**

```swift
// ItemManage/Models/Item.swift
import Foundation
import SwiftData

@Model
final class Item {
    @Attribute(.unique) var id: UUID
    var name: String
    var purchasePrice: Decimal
    var startDate: Date
    var endDate: Date?
    var expiryDate: Date?
    var specificLocation: String
    var createdAt: Date
    var updatedAt: Date
    var area: Area?

    init(name: String, purchasePrice: Decimal, startDate: Date, area: Area, specificLocation: String) {
        self.id = UUID()
        self.name = name
        self.purchasePrice = purchasePrice
        self.startDate = startDate
        self.area = area
        self.specificLocation = specificLocation
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    var isUsedUp: Bool { endDate != nil }

    var isExpired: Bool {
        guard !isUsedUp, let expiry = expiryDate else { return false }
        return Calendar.current.startOfDay(for: expiry) < Calendar.current.startOfDay(for: Date())
    }

    var isExpiringSoon: Bool {
        guard !isUsedUp, !isExpired, let expiry = expiryDate else { return false }
        let today = Calendar.current.startOfDay(for: Date())
        guard let sevenDaysLater = Calendar.current.date(byAdding: .day, value: 7, to: today) else { return false }
        let expiryDay = Calendar.current.startOfDay(for: expiry)
        return expiryDay >= today && expiryDay <= sevenDaysLater
    }

    var usedDays: Int {
        let end = endDate ?? Date()
        return ItemCostCalculator.usedDays(from: startDate, to: end)
    }

    var dailyCost: Decimal {
        ItemCostCalculator.dailyCost(price: purchasePrice, usedDays: usedDays)
    }

    var displayStatus: ItemStatus {
        if isUsedUp { return .usedUp }
        if isExpired { return .expired }
        if isExpiringSoon { return .expiringSoon }
        return .active
    }
}
```

```swift
// ItemManage/Utilities/ItemStatus.swift
import SwiftUI

enum ItemStatus {
    case active, expiringSoon, expired, usedUp

    var color: Color {
        switch self {
        case .active: .green
        case .expiringSoon: .yellow
        case .expired: .red
        case .usedUp: .gray
        }
    }

    var iconName: String {
        switch self {
        case .active: "checkmark.circle.fill"
        case .expiringSoon: "exclamationmark.triangle.fill"
        case .expired: "xmark.circle.fill"
        case .usedUp: "minus.circle.fill"
        }
    }
}
```

- [ ] **Step 3: Build — expect SUCCESS**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add Area and Item SwiftData models"
```

---

### Task 4: ModelContainer + Seed Data + Onboarding Flag

**Files:**
- Create: `ItemManage/Models/ModelContainer.swift`
- Modify: `ItemManage/App/ItemManageApp.swift`

- [ ] **Step 1: Container factory with seed**

```swift
// ItemManage/Models/ModelContainer.swift
import SwiftData

enum ModelContainerFactory {
    static let presetAreaNames = ["客厅", "卧室", "厨房", "卫生间", "储藏室"]

    static func create(isStoredInMemoryOnly: Bool = false) -> ModelContainer {
        let schema = Schema([Area.self, Item.self])
        let config = ModelConfiguration(isStoredInMemoryOnly: isStoredInMemoryOnly)
        let container = try! ModelContainer(for: schema, configurations: config)
        seedIfNeeded(container: container)
        return container
    }

    static func seedIfNeeded(container: ModelContainer) {
        let context = container.mainContext
        let descriptor = FetchDescriptor<Area>()
        guard (try? context.fetchCount(descriptor)) == 0 else { return }

        for name in presetAreaNames {
            context.insert(Area(name: name))
        }
        context.insert(Area(name: Area.uncategorizedName, isSystemReserved: true))
        try? context.save()
    }
}
```

- [ ] **Step 2: Wire app + UserDefaults onboarding key**

```swift
// ItemManageApp.swift — use ModelContainerFactory.create()
// @AppStorage("hasCompletedOnboarding") var hasCompletedOnboarding = false
// Show OnboardingView if !hasCompletedOnboarding else ContentView
```

- [ ] **Step 3: Build + run simulator — verify 6 areas in SwiftData**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: seed preset areas and uncategorized on first launch"
```

---

### Task 5: ItemSortOption + Tab Shell

**Files:**
- Create: `ItemManage/Utilities/ItemSortOption.swift`
- Modify: `ItemManage/Views/ContentView.swift`

- [ ] **Step 1: Sort enums**

```swift
enum ItemSortField: String, CaseIterable, Identifiable {
    case name, createdAt, dailyCost, purchasePrice, startDate
    var id: String { rawValue }
    var label: String { /* 名称 / 创建时间 / 每日成本 / 买入价格 / 开始使用时间 */ }
}

enum SortDirection: String, CaseIterable {
    case ascending, descending
}

struct ItemSortOption {
    var field: ItemSortField = .name
    var direction: SortDirection = .ascending

    func sorted(_ items: [Item]) -> [Item] {
        items.sorted { a, b in
            let cmp: ComparisonResult = switch field {
            case .name: a.name.localizedCompare(b.name)
            case .createdAt: a.createdAt.compare(b.createdAt)
            case .dailyCost: a.dailyCost.compare(b.dailyCost)
            case .purchasePrice: a.purchasePrice.compare(b.purchasePrice)
            case .startDate: a.startDate.compare(b.startDate)
            }
            return direction == .ascending ? cmp == .orderedAscending : cmp == .orderedDescending
        }
    }
}
```

- [ ] **Step 2: TabView shell**

```swift
TabView {
    ItemListView().tabItem { Label("物品", systemImage: "house") }
    SearchView().tabItem { Label("搜索", systemImage: "magnifyingglass") }
    AreaManageView().tabItem { Label("区域", systemImage: "folder") }
}
```

Create placeholder views returning `Text("...")` for now.

- [ ] **Step 3: Build SUCCESS**

- [ ] **Step 4: Commit**

---

### Task 6: ItemFormView (Add/Edit)

**Files:**
- Create: `ItemManage/Views/ItemFormView.swift`
- Create: `ItemManageTests/ItemValidationTests.swift`

- [ ] **Step 1: Validation tests**

Test: empty name fails; negative price fails; startDate > endDate fails; expiryDate no extra validation.

- [ ] **Step 2: Implement form**

- Form sections: 基本信息 / 位置信息 / 时间信息
- Area Picker: `@Query(sort: \Area.name)` filtered `!area.isSystemReserved`
- Inline "新建区域" via alert
- Wheel date pickers
- Save creates/updates Item, sets `updatedAt`

- [ ] **Step 3: Tests PASS + manual add item in simulator**

- [ ] **Step 4: Commit**

---

### Task 7: ItemDetailView

**Files:**
- Create: `ItemManage/Views/ItemDetailView.swift`

- [ ] **Step 1: Display all fields + cost stats**

- [ ] **Step 2: Toolbar: Edit (sheet ItemFormView), Mark Used Up (sets endDate = today), Delete (confirmation)**

- [ ] **Step 3: Status badges respecting priority (used up hides expired)**

- [ ] **Step 4: Commit**

---

### Task 8: ItemListView + ItemRowView

**Files:**
- Create: `ItemManage/Views/ItemListView.swift`
- Create: `ItemManage/Views/ItemRowView.swift`

- [ ] **Step 1: ItemRowView layout per spec**

Name + location (gray) | daily cost (orange) + status icon

- [ ] **Step 2: ItemListView**

- `@Query` all areas sorted by name
- `@Query` all items
- `@State` filterAreaID: UUID? (nil = 全部)
- `@State` sortOption: ItemSortOption
- Group by area in List + Section headers with count
- Show ALL areas including empty (0 件)
- NavigationLink → ItemDetailView
- Toolbar: + → ItemFormView sheet
- Toolbar Menu: filter areas
- Toolbar Menu: sort field + direction
- `.refreshable { /* trigger query refresh */ }`
- Swipe delete
- Empty state when zero items globally

- [ ] **Step 3: Manual test filter/sort/delete**

- [ ] **Step 4: Commit**

---

### Task 9: AreaManageView + DeleteAreaSheet

**Files:**
- Create: `ItemManage/Views/AreaManageView.swift`
- Create: `ItemManage/Views/DeleteAreaSheet.swift`

- [ ] **Step 1: List areas with item counts**

- [ ] **Step 2: Add / rename (alert or inline)**

- [ ] **Step 3: Delete flow**

If area has items → sheet with 3 options:
1. Move to another area (Picker of non-system areas excluding deleted)
2. Delete all items in area
3. Move to 「未分类」

If no items → confirm delete directly.
Block delete if `isSystemReserved`.

- [ ] **Step 4: Help toolbar → present OnboardingView**

- [ ] **Step 5: Commit**

---

### Task 10: SearchView + SearchViewModel

**Files:**
- Create: `ItemManage/ViewModels/SearchViewModel.swift`
- Create: `ItemManage/Views/SearchView.swift`

- [ ] **Step 1: SearchViewModel**

```swift
@Observable
final class SearchViewModel {
    var query = ""
    var sortOption = ItemSortOption()

    func filteredItems(from all: [Item]) -> [Item] {
        guard !query.isEmpty else { return [] }
        let q = query.lowercased()
        let matched = all.filter { item in
            item.name.localizedCaseInsensitiveContains(q)
            || (item.area?.name.localizedCaseInsensitiveContains(q) ?? false)
            || item.specificLocation.localizedCaseInsensitiveContains(q)
        }
        return sortOption.sorted(matched)
    }
}
```

- [ ] **Step 2: SearchView with searchable + highlight matched substring**

- [ ] **Step 3: Sort menu in search toolbar**

- [ ] **Step 4: Commit**

---

### Task 11: OnboardingView

**Files:**
- Create: `ItemManage/Views/OnboardingView.swift`

- [ ] **Step 1: TabView pages (3-4 screens)**

Cover: 记录物品、位置管理、成本计算、搜索

- [ ] **Step 2: 「开始使用」sets `@AppStorage("hasCompletedOnboarding") = true`**

- [ ] **Step 3: Reusable from AreaManageView help button (no reset of flag)**

- [ ] **Step 4: Commit**

---

### Task 12: UI Polish (Phase 2)

- [ ] **Step 1: Apply color scheme consistently (orange cost, status colors)**

- [ ] **Step 2: Dark mode check on all screens**

- [ ] **Step 3: Light animations on list insert/delete (.animation default)**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: UI polish for Phase 2"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run all unit tests**

`xcodebuild test -scheme ItemManage -destination 'platform=iOS Simulator,name=iPhone 16'`

- [ ] **Step 2: Manual smoke test checklist**

- [ ] First launch → onboarding → preset areas
- [ ] Add item → appears in list with daily cost
- [ ] Mark used up → gray icon, no expired icon
- [ ] Expiring soon → yellow icon
- [ ] Filter + sort menus work
- [ ] Delete area 3-way dialog
- [ ] Search finds by name/area/location
- [ ] Help reopens onboarding

- [ ] **Step 3: Commit spec + plan docs**

```bash
git add docs/
git commit -m "docs: finalize design spec and implementation plan"
```

---

## Out of Scope (Phase 3 — do NOT implement now)

- WCAG/accessibility audit
- 1000+ item performance tuning
- Empty state illustrations
- iCloud sync, notifications, photos, CSV

---

## Execution Notes

- Decimal in SwiftData: store as `Decimal` or encode as String if SwiftData issues arise on iOS 17 — prefer native Decimal first.
- 「未分类」must have `isSystemReserved = true` and be excluded from ItemFormView picker via `!area.isSystemReserved`.
- Status icon on list: only ONE icon using `displayStatus` priority.

import Foundation

enum ItemSortField: String, CaseIterable, Identifiable {
    case name, createdAt, dailyCost, purchasePrice, startDate
    var id: String { rawValue }
    var label: String {
        switch self {
        case .name: "名称"
        case .createdAt: "创建时间"
        case .dailyCost: "每日成本"
        case .purchasePrice: "买入价格"
        case .startDate: "开始使用时间"
        }
    }
}

enum SortDirection: String, CaseIterable {
    case ascending, descending
    var label: String { self == .ascending ? "升序" : "降序" }
}

struct ItemSortOption: Equatable {
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

private extension Decimal {
    func compare(_ other: Decimal) -> ComparisonResult {
        (self as NSDecimalNumber).compare(other as NSDecimalNumber)
    }
}

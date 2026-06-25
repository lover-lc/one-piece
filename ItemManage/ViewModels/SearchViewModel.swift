import Foundation

@Observable
final class SearchViewModel {
    var query = ""
    var sortOption = ItemSortOption()

    func filteredItems(from all: [Item]) -> [Item] {
        guard !query.isEmpty else { return [] }
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return [] }
        let matched = all.filter { item in
            item.name.localizedCaseInsensitiveContains(q)
            || (item.area?.name.localizedCaseInsensitiveContains(q) ?? false)
            || item.specificLocation.localizedCaseInsensitiveContains(q)
        }
        return sortOption.sorted(matched)
    }
}

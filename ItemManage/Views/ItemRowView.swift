import SwiftUI

struct ItemRowView: View {
    let item: Item
    var highlightQuery: String?

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                nameText
                    .font(.headline)
                Text(locationText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            HStack(spacing: 6) {
                Text(ItemCostCalculator.formatDailyCost(item.dailyCost))
                    .font(.body.weight(.bold))
                    .foregroundStyle(.orange)

                Image(systemName: item.displayStatus.iconName)
                    .foregroundStyle(item.displayStatus.color)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var nameText: some View {
        if let highlightQuery, !highlightQuery.isEmpty {
            highlightedName(item.name, query: highlightQuery)
        } else {
            Text(item.name)
        }
    }

    private func highlightedName(_ name: String, query: String) -> Text {
        guard let range = name.range(of: query, options: [.caseInsensitive, .diacriticInsensitive]) else {
            return Text(name)
        }
        let before = String(name[..<range.lowerBound])
        let match = String(name[range])
        let after = String(name[range.upperBound...])
        return Text(before) + Text(match).bold() + Text(after)
    }

    private var locationText: String {
        let areaName = item.area?.name ?? "—"
        let location = item.specificLocation.isEmpty ? "—" : item.specificLocation
        return "\(areaName) > \(location)"
    }
}

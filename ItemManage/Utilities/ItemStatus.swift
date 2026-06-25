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

    var label: String {
        switch self {
        case .active: "使用中"
        case .expiringSoon: "即将过期"
        case .expired: "已过期"
        case .usedUp: "已用完"
        }
    }
}

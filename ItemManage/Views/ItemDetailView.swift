import SwiftUI
import SwiftData

struct ItemDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var item: Item

    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false

    var body: some View {
        List {
            Section {
                statusBadge
            }

            Section("基本信息") {
                LabeledContent("物品名称", value: item.name)
                LabeledContent("买入价格", value: formatPrice(item.purchasePrice))
            }

            Section("位置信息") {
                LabeledContent("区域", value: item.area?.name ?? "—")
                LabeledContent("具体位置", value: item.specificLocation.isEmpty ? "—" : item.specificLocation)
            }

            Section("时间信息") {
                LabeledContent("开始使用时间", value: formatDate(item.startDate))
                if let endDate = item.endDate {
                    LabeledContent("用完时间", value: formatDate(endDate))
                }
                if let expiryDate = item.expiryDate {
                    LabeledContent("过期时间", value: formatDate(expiryDate))
                }
            }

            Section("成本统计") {
                LabeledContent("已使用天数", value: "\(item.usedDays) 天")
                LabeledContent("每日成本") {
                    Text(ItemCostCalculator.formatDailyCost(item.dailyCost))
                        .foregroundStyle(.orange)
                }
            }
        }
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("编辑") {
                    showingEditSheet = true
                }
            }
            if !item.isUsedUp {
                ToolbarItem(placement: .secondaryAction) {
                    Button("标记已用完") {
                        markUsedUp()
                    }
                }
            }
            ToolbarItem(placement: .destructiveAction) {
                Button("删除", role: .destructive) {
                    showingDeleteAlert = true
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            ItemFormView(item: item)
        }
        .alert("删除物品", isPresented: $showingDeleteAlert) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) {
                deleteItem()
            }
        } message: {
            Text("确定要删除「\(item.name)」吗？此操作无法撤销。")
        }
    }

    private var statusBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: item.displayStatus.iconName)
            Text(statusLabel)
        }
        .font(.subheadline.weight(.medium))
        .foregroundStyle(item.displayStatus.color)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(item.displayStatus.color.opacity(0.15))
        .clipShape(Capsule())
        .frame(maxWidth: .infinity, alignment: .leading)
        .listRowBackground(Color.clear)
    }

    private var statusLabel: String {
        switch item.displayStatus {
        case .active: "使用中"
        case .expiringSoon: "即将过期"
        case .expired: "已过期"
        case .usedUp: "已用完"
        }
    }

    private func formatPrice(_ price: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "¥"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: price as NSDecimalNumber) ?? "¥0.00"
    }

    private func formatDate(_ date: Date) -> String {
        date.formatted(date: .long, time: .omitted)
    }

    private func markUsedUp() {
        item.endDate = Calendar.current.startOfDay(for: Date())
        item.updatedAt = Date()
        try? modelContext.save()
    }

    private func deleteItem() {
        modelContext.delete(item)
        try? modelContext.save()
        dismiss()
    }
}

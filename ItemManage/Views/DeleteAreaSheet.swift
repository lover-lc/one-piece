import SwiftUI
import SwiftData

private enum AreaDeleteAction: String, CaseIterable, Identifiable {
    case moveToOther = "迁到其他区域"
    case deleteAllItems = "删除全部物品"
    case moveToUncategorized = "移至未分类"

    var id: String { rawValue }
}

struct DeleteAreaSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let area: Area

    @Query(filter: #Predicate<Area> { !$0.isSystemReserved }, sort: \Area.name)
    private var userAreas: [Area]

    @Query(filter: #Predicate<Area> { $0.isSystemReserved })
    private var systemAreas: [Area]

    @State private var selectedAction = AreaDeleteAction.moveToOther
    @State private var targetAreaID: UUID?

    private var availableTargets: [Area] {
        userAreas.filter { $0.id != area.id }
    }

    private var uncategorizedArea: Area? {
        systemAreas.first
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("区域「\(area.name)」中有 \(area.items.count) 件物品，请选择删除方式。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Section("处理方式") {
                    Picker("选择", selection: $selectedAction) {
                        ForEach(AreaDeleteAction.allCases) { action in
                            Text(action.rawValue).tag(action)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                if selectedAction == .moveToOther {
                    Section("目标区域") {
                        if availableTargets.isEmpty {
                            Text("没有其他可用区域")
                                .foregroundStyle(.secondary)
                        } else {
                            Picker("目标区域", selection: $targetAreaID) {
                                ForEach(availableTargets, id: \.id) { target in
                                    Text(target.name).tag(Optional(target.id))
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("删除区域")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("确认", role: .destructive) {
                        performDelete()
                    }
                    .disabled(!canConfirm)
                }
            }
            .onAppear {
                targetAreaID = availableTargets.first?.id
            }
            .onChange(of: selectedAction) { _, newValue in
                if newValue == .moveToOther, targetAreaID == nil {
                    targetAreaID = availableTargets.first?.id
                }
            }
        }
    }

    private var canConfirm: Bool {
        switch selectedAction {
        case .moveToOther:
            return targetAreaID != nil && !availableTargets.isEmpty
        case .deleteAllItems, .moveToUncategorized:
            return true
        }
    }

    private func performDelete() {
        let items = Array(area.items)

        switch selectedAction {
        case .moveToOther:
            guard let targetID = targetAreaID,
                  let target = availableTargets.first(where: { $0.id == targetID }) else { return }
            for item in items {
                item.area = target
                item.updatedAt = Date()
            }
        case .deleteAllItems:
            for item in items {
                modelContext.delete(item)
            }
        case .moveToUncategorized:
            guard let uncategorized = uncategorizedArea else { return }
            for item in items {
                item.area = uncategorized
                item.updatedAt = Date()
            }
        }

        modelContext.delete(area)
        try? modelContext.save()
        dismiss()
    }
}

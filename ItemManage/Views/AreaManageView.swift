import SwiftUI
import SwiftData

struct AreaManageView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \Area.name) private var areas: [Area]

    @State private var showingAddAlert = false
    @State private var newAreaName = ""

    @State private var areaToRename: Area?
    @State private var renameAreaName = ""
    @State private var showingRenameAlert = false

    @State private var areaToDelete: Area?
    @State private var showingDeleteConfirm = false
    @State private var showingDeleteSheet = false
    @State private var showingCannotDeleteSystemAlert = false

    @State private var showingHelp = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(areas) { area in
                    areaRow(area)
                }
                .onDelete(perform: deleteAreas)
            }
            .navigationTitle("区域")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingHelp = true
                    } label: {
                        Image(systemName: "questionmark.circle")
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        newAreaName = ""
                        showingAddAlert = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .alert("新建区域", isPresented: $showingAddAlert) {
                TextField("区域名称", text: $newAreaName)
                Button("取消", role: .cancel) {}
                Button("添加") {
                    addArea()
                }
            } message: {
                Text("请输入新区域名称")
            }
            .alert("重命名区域", isPresented: $showingRenameAlert) {
                TextField("区域名称", text: $renameAreaName)
                Button("取消", role: .cancel) {
                    areaToRename = nil
                }
                Button("保存") {
                    renameArea()
                }
            } message: {
                Text("请输入新的区域名称")
            }
            .alert("删除区域", isPresented: $showingDeleteConfirm) {
                Button("取消", role: .cancel) {
                    areaToDelete = nil
                }
                Button("删除", role: .destructive) {
                    confirmDeleteEmptyArea()
                }
            } message: {
                if let area = areaToDelete {
                    Text("确定要删除「\(area.name)」吗？此操作无法撤销。")
                }
            }
            .alert("无法删除", isPresented: $showingCannotDeleteSystemAlert) {
                Button("确定", role: .cancel) {}
            } message: {
                Text("「\(Area.uncategorizedName)」是系统保留区域，无法删除。")
            }
            .sheet(isPresented: $showingDeleteSheet, onDismiss: { areaToDelete = nil }) {
                if let area = areaToDelete {
                    DeleteAreaSheet(area: area)
                }
            }
            .sheet(isPresented: $showingHelp) {
                AreaHelpSheet()
            }
        }
    }

    private func areaRow(_ area: Area) -> some View {
        Button {
            guard !area.isSystemReserved else { return }
            areaToRename = area
            renameAreaName = area.name
            showingRenameAlert = true
        } label: {
            HStack {
                Text(area.name)
                Spacer()
                Text("\(area.items.count) 件")
                    .foregroundStyle(.secondary)
            }
        }
        .buttonStyle(.plain)
    }

    private func addArea() {
        let trimmed = newAreaName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        modelContext.insert(Area(name: trimmed))
        try? modelContext.save()
    }

    private func renameArea() {
        guard let area = areaToRename else { return }
        let trimmed = renameAreaName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        area.name = trimmed
        try? modelContext.save()
        areaToRename = nil
    }

    private func deleteAreas(at offsets: IndexSet) {
        for index in offsets {
            attemptDelete(areas[index])
        }
    }

    private func attemptDelete(_ area: Area) {
        if area.isSystemReserved {
            showingCannotDeleteSystemAlert = true
            return
        }

        areaToDelete = area
        if area.items.isEmpty {
            showingDeleteConfirm = true
        } else {
            showingDeleteSheet = true
        }
    }

    private func confirmDeleteEmptyArea() {
        guard let area = areaToDelete else { return }
        modelContext.delete(area)
        try? modelContext.save()
        areaToDelete = nil
    }
}

private struct AreaHelpSheet: View {
    @Environment(\.dismiss) private var dismiss

    private let pages: [(title: String, description: String, icon: String)] = [
        ("记录物品", "添加物品并记录买入价格、使用时间和存放位置。", "shippingbox"),
        ("位置管理", "按区域整理物品，随时查看每个区域的物品数量。", "folder"),
        ("成本计算", "自动计算每日使用成本，帮你了解物品的实际价值。", "yensign.circle"),
        ("搜索", "按名称、区域或具体位置快速找到物品。", "magnifyingglass"),
    ]

    var body: some View {
        NavigationStack {
            TabView {
                ForEach(pages.indices, id: \.self) { index in
                    let page = pages[index]
                    VStack(spacing: 24) {
                        Image(systemName: page.icon)
                            .font(.system(size: 64))
                            .foregroundStyle(.tint)
                        Text(page.title)
                            .font(.title2.bold())
                        Text(page.description)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .navigationTitle("使用帮助")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("关闭") {
                        dismiss()
                    }
                }
            }
        }
    }
}

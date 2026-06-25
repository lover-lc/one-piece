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
            .animation(.default, value: areas.map(\.id))
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
                OnboardingView(isPresentedAsSheet: true)
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

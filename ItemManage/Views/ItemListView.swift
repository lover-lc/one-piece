import SwiftUI
import SwiftData

struct ItemListView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \Area.name) private var areas: [Area]
    @Query private var allItems: [Item]

    @State private var filterAreaID: UUID?
    @State private var sortOption = ItemSortOption()
    @State private var showAddSheet = false
    @State private var refreshID = UUID()

    var body: some View {
        NavigationStack {
            listContent
                .navigationTitle("物品")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            showAddSheet = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        filterMenu
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        sortMenu
                    }
                }
                .sheet(isPresented: $showAddSheet) {
                    ItemFormView(item: nil)
                }
        }
    }

    @ViewBuilder
    private var listContent: some View {
        if allItems.isEmpty {
            emptyState
        } else if filterAreaID != nil && !hasMatchingFilteredItems {
            filteredEmptyState
        } else {
            List {
                ForEach(displayedAreas, id: \.id) { area in
                    let areaItems = items(for: area)
                    if filterAreaID != nil || !areaItems.isEmpty {
                        Section {
                            ForEach(areaItems, id: \.id) { item in
                                NavigationLink {
                                    ItemDetailView(item: item)
                                } label: {
                                    ItemRowView(item: item)
                                }
                            }
                            .onDelete { indexSet in
                                deleteItems(at: indexSet, in: area)
                            }
                        } header: {
                            Text("\(area.name) (\(areaItems.count))")
                        }
                    }
                }
            }
            .animation(.default, value: filterAreaID)
            .animation(.default, value: sortOption)
            .id(refreshID)
            .refreshable {
                refreshID = UUID()
            }
        }
    }

    private var displayedAreas: [Area] {
        if let filterAreaID {
            return areas.filter { $0.id == filterAreaID }
        }
        return areas
    }

    private var hasMatchingFilteredItems: Bool {
        displayedAreas.contains { !items(for: $0).isEmpty }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("暂无物品", systemImage: "shippingbox")
        } description: {
            Text("点击 + 添加第一个物品")
        }
    }

    private var filteredEmptyState: some View {
        ContentUnavailableView {
            Label("暂无物品", systemImage: "line.3.horizontal.decrease.circle")
        } description: {
            Text("当前筛选条件下没有物品")
        }
    }

    private var filterMenu: some View {
        Menu {
            Button {
                filterAreaID = nil
            } label: {
                if filterAreaID == nil {
                    Label("全部", systemImage: "checkmark")
                } else {
                    Text("全部")
                }
            }
            ForEach(areas, id: \.id) { area in
                Button {
                    filterAreaID = area.id
                } label: {
                    if filterAreaID == area.id {
                        Label(area.name, systemImage: "checkmark")
                    } else {
                        Text(area.name)
                    }
                }
            }
        } label: {
            Label("筛选", systemImage: "line.3.horizontal.decrease.circle")
        }
    }

    private var sortMenu: some View {
        Menu {
            ForEach(ItemSortField.allCases) { field in
                Button {
                    sortOption.field = field
                } label: {
                    if sortOption.field == field {
                        Label(field.label, systemImage: "checkmark")
                    } else {
                        Text(field.label)
                    }
                }
            }
            Divider()
            ForEach(SortDirection.allCases, id: \.self) { direction in
                Button {
                    sortOption.direction = direction
                } label: {
                    if sortOption.direction == direction {
                        Label(direction.label, systemImage: "checkmark")
                    } else {
                        Text(direction.label)
                    }
                }
            }
        } label: {
            Label("排序", systemImage: "arrow.up.arrow.down")
        }
    }

    private func items(for area: Area) -> [Item] {
        let filtered = allItems.filter { item in
            guard item.area?.id == area.id else { return false }
            if let filterAreaID {
                return filterAreaID == area.id
            }
            return true
        }
        return sortOption.sorted(filtered)
    }

    private func deleteItems(at offsets: IndexSet, in area: Area) {
        let areaItems = items(for: area)
        withAnimation {
            for index in offsets {
                modelContext.delete(areaItems[index])
            }
            try? modelContext.save()
        }
    }
}

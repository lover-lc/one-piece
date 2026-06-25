import SwiftUI
import SwiftData

struct SearchView: View {
    @Query private var allItems: [Item]
    @State private var viewModel = SearchViewModel()

    private var trimmedQuery: String {
        viewModel.query.trimmingCharacters(in: .whitespaces)
    }

    private var results: [Item] {
        viewModel.filteredItems(from: allItems)
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("搜索")
                .searchable(text: $viewModel.query, prompt: "搜索物品、区域或位置")
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        sortMenu
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if trimmedQuery.isEmpty {
            emptyPrompt
        } else if results.isEmpty {
            noResults
        } else {
            List {
                ForEach(results, id: \.id) { item in
                    NavigationLink {
                        ItemDetailView(item: item)
                    } label: {
                        ItemRowView(item: item, highlightQuery: trimmedQuery)
                    }
                }
            }
        }
    }

    private var emptyPrompt: some View {
        ContentUnavailableView {
            Label("搜索", systemImage: "magnifyingglass")
        } description: {
            Text("输入关键词开始搜索")
        }
    }

    private var noResults: some View {
        ContentUnavailableView {
            Label("无结果", systemImage: "magnifyingglass")
        } description: {
            Text("未找到匹配物品")
        }
    }

    private var sortMenu: some View {
        Menu {
            ForEach(ItemSortField.allCases) { field in
                Button {
                    viewModel.sortOption.field = field
                } label: {
                    if viewModel.sortOption.field == field {
                        Label(field.label, systemImage: "checkmark")
                    } else {
                        Text(field.label)
                    }
                }
            }
            Divider()
            ForEach(SortDirection.allCases, id: \.self) { direction in
                Button {
                    viewModel.sortOption.direction = direction
                } label: {
                    if viewModel.sortOption.direction == direction {
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
}

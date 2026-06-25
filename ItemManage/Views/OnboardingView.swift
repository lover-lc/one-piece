import SwiftUI

struct OnboardingView: View {
    var isPresentedAsSheet: Bool = false

    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @Environment(\.dismiss) private var dismiss

    private let pages: [(title: String, description: String, icon: String)] = [
        ("记录物品", "添加物品并记录买入价格、使用时间和存放位置。", "shippingbox"),
        ("位置管理", "按区域整理物品，随时查看每个区域的物品数量。", "folder"),
        ("成本计算", "自动计算每日使用成本，帮你了解物品的实际价值。", "yensign.circle"),
        ("搜索", "按名称、区域或具体位置快速找到物品。", "magnifyingglass"),
    ]

    var body: some View {
        Group {
            if isPresentedAsSheet {
                NavigationStack {
                    onboardingPages
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
            } else {
                onboardingPages
            }
        }
    }

    private var onboardingPages: some View {
        TabView {
            ForEach(pages.indices, id: \.self) { index in
                let page = pages[index]
                VStack(spacing: 24) {
                    Spacer()
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
                    Spacer()
                    if index == pages.count - 1, !isPresentedAsSheet {
                        Button("开始使用") {
                            hasCompletedOnboarding = true
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.bottom, 48)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemGroupedBackground))
            }
        }
        .tabViewStyle(.page)
        .background(Color(.systemGroupedBackground))
        .indexViewStyle(.page(backgroundDisplayMode: .always))
    }
}

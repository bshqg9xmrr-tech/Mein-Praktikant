// GoalsView.swift — ziel-hierarchie mit echter ableitung, die native
// entsprechung zu app/js/goals-view.js. jedes ziel wird bewusst an ein
// übergeordnetes ziel gehängt; der fortschritt läuft automatisch über
// GoalDerivation.effectiveProgress von unten nach oben zusammen.

import SwiftUI
import SwiftData
import MeinPraktikantCore

struct GoalsView: View {
    @Query(sort: \Area.sortOrder) private var areas: [Area]
    @Query private var goals: [Goal]
    @Query private var tasks: [TaskItem]

    @State private var selectedAreaID: UUID?
    @State private var showCreateSheet = false

    private var selectedArea: Area? {
        areas.first { $0.id == selectedAreaID } ?? areas.first
    }

    private var rootGoals: [Goal] {
        guard let area = selectedArea else { return [] }
        return goals
            .filter { $0.level == .year && $0.areaID == area.id }
            .sorted { $0.year > $1.year }
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                areaPicker

                if rootGoals.isEmpty {
                    ContentUnavailableView(
                        "noch kein jahresziel",
                        systemImage: "target",
                        description: Text("leg im bereich „\(selectedArea?.name ?? "")“ ein jahresziel an, alles weitere leitest du daraus ab.")
                    )
                } else {
                    List {
                        ForEach(rootGoals) { goal in
                            GoalNodeView(goal: goal, allGoals: goals, allTasks: tasks, depth: 0)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("ziele")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreateSheet = true
                    } label: {
                        Label("neues ziel", systemImage: "plus")
                    }
                    .disabled(selectedArea == nil)
                }
            }
            .sheet(isPresented: $showCreateSheet) {
                if let areaID = selectedArea?.id {
                    CreateGoalSheet(areaID: areaID, allGoals: goals)
                }
            }
            .onAppear {
                if selectedAreaID == nil { selectedAreaID = areas.first?.id }
            }
        }
    }

    private var areaPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(areas) { area in
                    Button(area.name) { selectedAreaID = area.id }
                        .buttonStyle(.bordered)
                        .tint(area.id == (selectedArea?.id) ? Color(hex: area.colorHex) : .secondary)
                }
            }
            .padding(.horizontal)
        }
    }
}

private struct GoalNodeView: View {
    let goal: Goal
    let allGoals: [Goal]
    let allTasks: [TaskItem]
    let depth: Int

    private var progress: Int {
        GoalDerivation.effectiveProgress(goal, goals: allGoals, tasks: allTasks)
    }
    private var derived: Bool {
        GoalDerivation.isDerived(goal, goals: allGoals, tasks: allTasks)
    }
    private var children: [Goal] {
        GoalDerivation.children(of: goal.id, in: allGoals)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.title).font(.headline)
                    Text("\(goal.level.label) · \(derived ? "abgeleitet" : "manuell gesetzt")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    ProgressView(value: Double(progress), total: 100)
                        .tint(.accentColor)
                }
                Spacer()
                Text("\(progress)%")
                    .font(.title3.bold())
            }
            if !children.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(children) { child in
                        GoalNodeView(goal: child, allGoals: allGoals, allTasks: allTasks, depth: depth + 1)
                    }
                }
                .padding(.leading, 16)
                .overlay(alignment: .leading) {
                    Rectangle().fill(.quaternary).frame(width: 2)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private extension Color {
    /// sehr einfacher hex-parser, nur für die seed-/beispielfarben hier
    /// gedacht — für die echte app gehört das ins DesignSystem-modul
    /// aus architecture.md §2.
    init(hex: String) {
        var hexValue = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexValue = hexValue.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: hexValue).scanHexInt64(&rgb)
        let r = Double((rgb & 0xFF0000) >> 16) / 255
        let g = Double((rgb & 0x00FF00) >> 8) / 255
        let b = Double(rgb & 0x0000FF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// ContentView.swift — minimale tab-navigation für diesen startpunkt
// (nur "heute" und "ziele" — die übrigen screens aus dem web-prototyp
// und dem mockup folgen, sobald dieses gerüst zu einem vollen
// Xcode-projekt ausgebaut wird, siehe README.md).

import SwiftUI
import SwiftData
import MeinPraktikantCore

struct ContentView: View {
    @Environment(\.modelContext) private var context
    @Query private var areas: [Area]

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("heute", systemImage: "checkmark.circle") }
            GoalsView()
                .tabItem { Label("ziele", systemImage: "target") }
        }
        .task { seedIfNeeded() }
    }

    /// legt beim allerersten start (leere datenbank) dieselben
    /// beispieldaten an wie der web-prototyp (app/js/storage.js), damit
    /// beide versionen vergleichbar aussehen.
    private func seedIfNeeded() {
        guard areas.isEmpty else { return }

        let privat = Area(name: "privat", colorHex: "#F2895F", sortOrder: 0)
        let plenum = Area(name: "plenum", colorHex: "#2FA8A0", sortOrder: 1)
        let tecis = Area(name: "tecis", colorHex: "#8B6FE8", sortOrder: 2)
        let sonstige = Area(name: "sonstige", colorHex: "#8891A8", sortOrder: 3)
        [privat, plenum, tecis, sonstige].forEach { context.insert($0) }

        let now = Date.now
        let year = Calendar.current.component(.year, from: now)
        let quarter = (Calendar.current.component(.month, from: now) - 1) / 3 + 1
        let month = Calendar.current.component(.month, from: now)
        let week = Calendar.current.component(.weekOfYear, from: now)

        let gYear = Goal(areaID: tecis.id, level: .year, year: year, title: "neukunden-portfolio tecis ausbauen")
        let gQuarter = Goal(areaID: tecis.id, level: .quarter, year: year, quarter: quarter, parentID: gYear.id, title: "pipeline auf 12 aktive leads bringen")
        let gMonth = Goal(areaID: tecis.id, level: .month, year: year, month: month, parentID: gQuarter.id, title: "akquise-workshop halten")
        let gWeekPitch = Goal(areaID: tecis.id, level: .week, year: year, week: week, parentID: gMonth.id, title: "tecis-pitch fertig vorbereiten", manualProgress: 100)
        let gWeekCalls = Goal(areaID: tecis.id, level: .week, year: year, week: week, parentID: gMonth.id, title: "akquise-telefonate führen", manualProgress: 20)
        [gYear, gQuarter, gMonth, gWeekPitch, gWeekCalls].forEach { context.insert($0) }

        context.insert(UserSettings())

        try? context.save()
    }
}

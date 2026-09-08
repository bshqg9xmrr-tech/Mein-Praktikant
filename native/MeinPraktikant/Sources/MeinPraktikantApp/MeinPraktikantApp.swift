// MeinPraktikantApp.swift — einstiegspunkt. `swift run` startet dies auf
// macOS direkt als fenster (siehe README.md im native/-ordner für die
// grenzen dieses ansatzes ggü. einem vollen Xcode-multiplatform-target).

import SwiftUI
import SwiftData
import MeinPraktikantCore

@main
struct MeinPraktikantApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            Area.self,
            Goal.self,
            TaskItem.self,
            Note.self,
            JournalEntry.self,
            Habit.self,
            HabitLog.self,
            UserSettings.self,
        ])
    }
}

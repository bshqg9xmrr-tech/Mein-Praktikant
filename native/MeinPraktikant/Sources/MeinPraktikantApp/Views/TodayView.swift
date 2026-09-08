// TodayView.swift — sehr einfache erfassung (siehe context.md §3.1,
// "erst einfache eingabe, dann erst später ki-planung"). in diesem
// startpunkt nur capture + abhaken, ohne planungs-/kalender-schritt —
// das entspricht dem web-prototyp (app/js/today.js), der die
// vollständigere referenz ist.

import SwiftUI
import SwiftData
import MeinPraktikantCore

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \TaskItem.createdAt) private var allTasks: [TaskItem]
    @State private var newTitle = ""

    private var todayTasks: [TaskItem] {
        allTasks.filter { Calendar.current.isDateInToday($0.date) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                HStack {
                    TextField("was steht heute an?", text: $newTitle)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit(addTask)
                    Button(action: addTask) {
                        Image(systemName: "plus.circle.fill")
                    }
                    .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal)

                List {
                    if todayTasks.isEmpty {
                        Text("noch nichts erfasst — einfach oben eintragen.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(todayTasks) { task in
                        HStack {
                            Button {
                                task.done.toggle()
                            } label: {
                                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                            }
                            .buttonStyle(.plain)
                            Text(task.title)
                                .strikethrough(task.done)
                                .foregroundStyle(task.done ? .secondary : .primary)
                        }
                    }
                    .onDelete(perform: deleteTasks)
                }
                .listStyle(.plain)
            }
            .navigationTitle("heute")
        }
    }

    private func addTask() {
        let trimmed = newTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        context.insert(TaskItem(title: trimmed, date: .now))
        newTitle = ""
    }

    private func deleteTasks(at offsets: IndexSet) {
        for index in offsets {
            context.delete(todayTasks[index])
        }
    }
}

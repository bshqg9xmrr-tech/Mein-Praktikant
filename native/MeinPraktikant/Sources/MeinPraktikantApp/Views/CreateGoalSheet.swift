// CreateGoalSheet.swift — hier passiert die eigentliche "ableitung von
// kurzfristigen zielen aus langfristigen zielen": jedes neue ziel (außer
// auf jahresebene) wird bewusst an ein ziel der darüberliegenden ebene
// gehängt (`parentID`). vgl. app/js/goals-view.js#openCreateGoalModal.

import SwiftUI
import MeinPraktikantCore

struct CreateGoalSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let areaID: UUID
    let allGoals: [Goal]

    @State private var level: GoalLevel = .year
    @State private var title = ""
    @State private var year = Calendar.current.component(.year, from: .now)
    @State private var quarter = 1
    @State private var month = 1
    @State private var week = 1
    @State private var parentID: UUID?

    private var possibleParents: [Goal] {
        GoalDerivation.possibleParents(for: level, areaID: areaID, in: allGoals)
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("ebene", selection: $level) {
                    ForEach(GoalLevel.allCases, id: \.self) { l in
                        Text("\(l.label)sziel").tag(l)
                    }
                }
                .onChange(of: level) { parentID = nil }

                TextField("titel", text: $title)

                Section("zeitraum") {
                    Stepper("jahr: \(year)", value: $year, in: 2020...2100)
                    if level == .quarter {
                        Stepper("quartal: Q\(quarter)", value: $quarter, in: 1...4)
                    }
                    if level == .month {
                        Stepper("monat: \(month)", value: $month, in: 1...12)
                    }
                    if level == .week {
                        Stepper("kalenderwoche: \(week)", value: $week, in: 1...53)
                    }
                }

                if let parentLevel = level.parentLevel {
                    Section("übergeordnetes \(parentLevel.label)sziel (wirkt darauf ein)") {
                        if possibleParents.isEmpty {
                            Text("noch kein \(parentLevel.label)sziel in diesem bereich — dieses ziel bleibt zunächst ohne übergeordnetes ziel.")
                                .foregroundStyle(.secondary)
                                .font(.footnote)
                        } else {
                            Picker("übergeordnetes ziel", selection: $parentID) {
                                Text("kein übergeordnetes ziel").tag(UUID?.none)
                                ForEach(possibleParents) { parent in
                                    Text(parent.title).tag(Optional(parent.id))
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("neues ziel")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("anlegen", action: save)
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let goal = Goal(
            areaID: areaID,
            level: level,
            year: year,
            quarter: level == .quarter ? quarter : nil,
            month: level == .month ? month : nil,
            week: level == .week ? week : nil,
            parentID: parentID,
            title: trimmed
        )
        context.insert(goal)
        dismiss()
    }
}

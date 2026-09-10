// GoalDerivation.swift — dieselbe ableitungs-logik wie im web-prototyp
// (siehe ../../../app/js/goals.js#effectiveProgress). bewusst als reine,
// zustandslose funktion über arrays gehalten (kein direkter SwiftData-
// fetch hier drin), damit sie unabhängig vom persistenz-layer testbar
// bleibt.

import Foundation

public enum GoalDerivation {
    public static func children(of goalID: UUID, in goals: [Goal]) -> [Goal] {
        goals.filter { $0.parentID == goalID }
    }

    public static func linkedTasks(of goalID: UUID, in tasks: [TaskItem]) -> [TaskItem] {
        tasks.filter { $0.goalID == goalID }
    }

    /// kernalgorithmus: hat ein ziel unterziele, ist sein fortschritt der
    /// durchschnitt der unterziele (rekursiv) — das ist die eigentliche
    /// ableitung. hat ein wochenziel keine unterziele, aber verlinkte
    /// tasks, zählt der anteil erledigter tasks. sonst der manuell
    /// gesetzte wert.
    public static func effectiveProgress(
        _ goal: Goal,
        goals: [Goal],
        tasks: [TaskItem],
        seen: Set<UUID> = []
    ) -> Int {
        if seen.contains(goal.id) { return goal.manualProgress } // schutz vor zirkulären referenzen
        var seen = seen
        seen.insert(goal.id)

        let kids = children(of: goal.id, in: goals)
        if !kids.isEmpty {
            let sum = kids.reduce(0) { $0 + effectiveProgress($1, goals: goals, tasks: tasks, seen: seen) }
            return Int((Double(sum) / Double(kids.count)).rounded())
        }

        if goal.level == .week {
            let linked = linkedTasks(of: goal.id, in: tasks)
            if !linked.isEmpty {
                let done = linked.filter(\.done).count
                return Int((Double(done) / Double(linked.count) * 100).rounded())
            }
        }

        return goal.manualProgress
    }

    public static func isDerived(_ goal: Goal, goals: [Goal], tasks: [TaskItem]) -> Bool {
        if !children(of: goal.id, in: goals).isEmpty { return true }
        if goal.level == .week && !linkedTasks(of: goal.id, in: tasks).isEmpty { return true }
        return false
    }

    public static func possibleParents(for level: GoalLevel, areaID: UUID, in goals: [Goal]) -> [Goal] {
        guard let parentLevel = level.parentLevel else { return [] }
        return goals
            .filter { $0.level == parentLevel && $0.areaID == areaID }
            .sorted { $0.title < $1.title }
    }

    /// weiche validierung (kein hard-block), siehe architecture.md §4.1.
    public static func softLimitExceeded(
        level: GoalLevel,
        areaID: UUID,
        year: Int,
        quarter: Int?,
        month: Int?,
        week: Int?,
        existingGoals: [Goal],
        weeklyGoalCount: Int,
        monthlyGoalCount: Int
    ) -> Int? {
        guard level == .week || level == .month else { return nil }
        let limit = level == .week ? weeklyGoalCount : monthlyGoalCount
        let matching = existingGoals.filter {
            $0.level == level && $0.areaID == areaID && $0.year == year && $0.quarter == quarter && $0.month == month && $0.week == week
        }
        return matching.count >= limit ? matching.count : nil
    }
}

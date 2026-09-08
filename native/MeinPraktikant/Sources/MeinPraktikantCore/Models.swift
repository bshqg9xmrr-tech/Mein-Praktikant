// Models.swift — datenmodell, siehe architecture.md §5.
//
// vereinfachung ggü. architecture.md: dort ist `day` als eigene
// goal-level gelistet. hier (wie schon im web-prototyp unter ../../app)
// übernehmen `TaskItem`s die tagesebene direkt, indem sie optional auf
// ein wochenziel verweisen (`goalID`) — das deckt "tagesebene wirkt auf
// wochenziel ein" ab, ohne ein zusätzliches leeres modell zu brauchen.
//
// bewusst KEINE SwiftData `@Relationship`-graphen, sondern einfache
// UUID-fremdschlüssel (wie im web-prototyp) — einfacher zu lesen, zu
// migrieren (z. b. später richtung Supabase) und näher an der bereits
// abgestimmten datenmodell-skizze aus architecture.md §5.

import Foundation
import SwiftData

public enum GoalLevel: String, Codable, CaseIterable, Hashable, Sendable {
    case year, quarter, month, week

    public var label: String {
        switch self {
        case .year: return "jahr"
        case .quarter: return "quartal"
        case .month: return "monat"
        case .week: return "woche"
        }
    }

    /// die ebene, auf die ein ziel dieser ebene typischerweise "einwirkt".
    public var parentLevel: GoalLevel? {
        switch self {
        case .year: return nil
        case .quarter: return .year
        case .month: return .quarter
        case .week: return .month
        }
    }
}

@Model
public final class Area {
    public var id: UUID
    public var name: String
    public var colorHex: String
    public var sortOrder: Int

    public init(id: UUID = UUID(), name: String, colorHex: String, sortOrder: Int = 0) {
        self.id = id
        self.name = name
        self.colorHex = colorHex
        self.sortOrder = sortOrder
    }
}

@Model
public final class Goal {
    public var id: UUID
    public var areaID: UUID
    public var level: GoalLevel
    public var year: Int
    public var quarter: Int?
    public var month: Int?
    public var week: Int?
    /// id des übergeordneten ziels (eine ebene höher) — das ist die
    /// eigentliche "ableitung": ein neues, kurzfristigeres ziel hängt
    /// sich hier bewusst an ein langfristigeres.
    public var parentID: UUID?
    public var title: String
    /// manuell gesetzter fortschritt (0...100) — zählt nur, solange das
    /// ziel keine unterziele (bzw. bei wochenzielen keine verlinkten
    /// tasks) hat. siehe `GoalDerivation.effectiveProgress`.
    public var manualProgress: Int
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        areaID: UUID,
        level: GoalLevel,
        year: Int,
        quarter: Int? = nil,
        month: Int? = nil,
        week: Int? = nil,
        parentID: UUID? = nil,
        title: String,
        manualProgress: Int = 0,
        createdAt: Date = .now
    ) {
        self.id = id
        self.areaID = areaID
        self.level = level
        self.year = year
        self.quarter = quarter
        self.month = month
        self.week = week
        self.parentID = parentID
        self.title = title
        self.manualProgress = manualProgress
        self.createdAt = createdAt
    }
}

@Model
public final class TaskItem {
    public var id: UUID
    public var title: String
    public var date: Date
    public var areaID: UUID?
    /// meist ein wochenziel — die "tagesebene wirkt auf das wochenziel
    /// ein"-verbindung aus context.md §3.1.
    public var goalID: UUID?
    public var scheduledTime: Date?
    public var estimatedMinutes: Int?
    public var done: Bool
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        title: String,
        date: Date,
        areaID: UUID? = nil,
        goalID: UUID? = nil,
        scheduledTime: Date? = nil,
        estimatedMinutes: Int? = nil,
        done: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.date = date
        self.areaID = areaID
        self.goalID = goalID
        self.scheduledTime = scheduledTime
        self.estimatedMinutes = estimatedMinutes
        self.done = done
        self.createdAt = createdAt
    }
}

@Model
public final class Note {
    public var id: UUID
    public var title: String
    public var body: String
    public var createdAt: Date

    public init(id: UUID = UUID(), title: String, body: String, createdAt: Date = .now) {
        self.id = id
        self.title = title
        self.body = body
        self.createdAt = createdAt
    }
}

@Model
public final class JournalEntry {
    public var id: UUID
    public var date: Date
    public var gratitude: [String]
    public var events: String
    public var thoughts: String
    public var feelings: [String]

    public init(
        id: UUID = UUID(),
        date: Date,
        gratitude: [String] = ["", "", ""],
        events: String = "",
        thoughts: String = "",
        feelings: [String] = []
    ) {
        self.id = id
        self.date = date
        self.gratitude = gratitude
        self.events = events
        self.thoughts = thoughts
        self.feelings = feelings
    }
}

@Model
public final class Habit {
    public var id: UUID
    public var name: String
    public var areaID: UUID?
    public var createdAt: Date

    public init(id: UUID = UUID(), name: String, areaID: UUID? = nil, createdAt: Date = .now) {
        self.id = id
        self.name = name
        self.areaID = areaID
        self.createdAt = createdAt
    }
}

@Model
public final class HabitLog {
    public var id: UUID
    public var habitID: UUID
    public var date: Date
    public var done: Bool

    public init(id: UUID = UUID(), habitID: UUID, date: Date, done: Bool = true) {
        self.id = id
        self.habitID = habitID
        self.date = date
        self.done = done
    }
}

@Model
public final class UserSettings {
    public var id: UUID
    public var weeklyGoalCount: Int
    public var monthlyGoalCount: Int
    public var weekStartsMonday: Bool
    public var dayStartHour: Int
    public var defaultTaskMinutes: Int
    public var breakMinutes: Int
    public var calendarAutoExport: Bool

    public init(
        id: UUID = UUID(),
        weeklyGoalCount: Int = 2,
        monthlyGoalCount: Int = 3,
        weekStartsMonday: Bool = true,
        dayStartHour: Int = 9,
        defaultTaskMinutes: Int = 30,
        breakMinutes: Int = 10,
        calendarAutoExport: Bool = false
    ) {
        self.id = id
        self.weeklyGoalCount = weeklyGoalCount
        self.monthlyGoalCount = monthlyGoalCount
        self.weekStartsMonday = weekStartsMonday
        self.dayStartHour = dayStartHour
        self.defaultTaskMinutes = defaultTaskMinutes
        self.breakMinutes = breakMinutes
        self.calendarAutoExport = calendarAutoExport
    }
}

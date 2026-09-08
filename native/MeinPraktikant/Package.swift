// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MeinPraktikant",
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
    ],
    products: [
        .library(name: "MeinPraktikantCore", targets: ["MeinPraktikantCore"]),
        .executable(name: "MeinPraktikantApp", targets: ["MeinPraktikantApp"]),
    ],
    targets: [
        .target(name: "MeinPraktikantCore"),
        .executableTarget(
            name: "MeinPraktikantApp",
            dependencies: ["MeinPraktikantCore"]
        ),
    ]
)

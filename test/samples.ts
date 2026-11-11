/** One small, valid source per Pele diagram type the tests sweep. */
export const SAMPLES: Readonly<Record<string, string>> = {
  flowchart: `flowchart LR
  subgraph outer [Outer]
    subgraph inner [Inner]
      A[Start] --> B(Round)
    end
  end
  B -->|label| C{Choice}
  C --> D[(Database)]
  style B fill:#ffcc00,stroke:#333`,
  sequence: `sequenceDiagram
  participant U as User
  participant P as Pi
  U->>P: render this
  activate P
  P-->>U: diagram
  deactivate P
  Note over U,P: done`,
  class: `classDiagram
  class Animal {
    +String name
    +speak() void
  }
  Animal <|-- Dog`,
  state: `stateDiagram-v2
  [*] --> Idle
  Idle --> Running: start
  Running --> [*]`,
  er: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  CUSTOMER {
    string name
    int id PK
  }`,
  gantt: `gantt
  title Plan
  dateFormat YYYY-MM-DD
  section A
  Task one :crit, a1, 2026-01-01, 30d
  Task two :after a1, 20d`,
  pie: `pie title Pets
  "Dogs" : 386
  "Cats" : 85`,
  git: `gitGraph
  commit
  branch develop
  commit
  checkout main
  merge develop`,
  mindmap: `mindmap
  root((Pi))
    Tools
      render_diagram
    Commands`,
  timeline: `timeline
  title History
  2024 : Start
  2025 : Grow`,
  journey: `journey
  title Day
  section Morning
    Wake up: 3: Me
    Coffee: 5: Me`,
  quadrant: `quadrantChart
  title Reach
  x-axis Low --> High
  y-axis Low --> High
  A: [0.3, 0.6]`,
  xychart: `xychart
  x-axis [jan, feb, mar]
  bar [3, 5, 2]
  line [2, 4, 3]`,
  sankey: `sankey-beta
  A,B,10
  A,C,5`,
  kanban: `kanban
  todo[Todo]
    t1[Write docs]
  done[Done]
    t2[Ship]`,
  block: `block-beta
  columns 2
  a b`,
  packet: `packet-beta
  0-15: "Source"
  16-31: "Destination"`,
  requirement: `requirementDiagram
  requirement r1 {
    id: 1
    text: works
    risk: low
    verifymethod: test
  }
  element e1 {
    type: sim
  }
  e1 - satisfies -> r1`,
  architecture: `architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service server(server)[Server] in api
  db:L -- R:server`,
  radar: `radar-beta
  axis a, b, c
  curve x{1, 2, 3}`,
  treemap: `treemap-beta
"Root"
  "A": 10
  "B": 20`,
  c4: `C4Context
  Person(u, "User")
  System(s, "System")
  Rel(u, s, "Uses")`,
};

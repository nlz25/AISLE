# AISLE website roadmap

The website grows in three stages. These are development priorities; future capabilities are not presented as operating services.

| Stage | Visitor experience | Content and implementation | Ready when |
|---|---|---|---|
| **1 · Introduce the research** | Understand AISLE, explore the first study, read its results and discuss a contribution | Three English static pages; original experiment video; completed-study scope; four task categories; two separate leaderboards; category sorting; clickable model profiles and score breakdowns; methods; scientific directions with readiness labels; GitHub collaboration form | Content and score provenance are reviewed; pages and media load; results retain correct coverage; all public links have an explicit release status |
| **2 · Explore the evidence** | Follow a result into a task, condition and experimental trajectory | Versioned data schema; condition filters; per-task results; side-by-side model comparison under matched conditions; action/measurement timeline; raw-data downloads; release history | Public run IDs, measurement provenance, exact configurations and task versions are available; each chart can be reproduced from the released data |
| **3 · Participate in evaluation** | Contribute a task, connect an agent or coordinate a laboratory evaluation | Documented task packages and agent adapters; structured submissions; validation and review; model/harness/tool/skill metadata; laboratory execution records; separate simulated and physical results; operating ownership and release policies | Interfaces and evaluators are verified, physical execution and resource accounting are reliable, and the contribution/review process has a responsible operator |

## First-stage scope

The current pages present **AISLE**, the first-stage study. The 4,079 physical experiments, two evaluated sites and seven models refer only to that study. Research directions under development are not added to its results or task-coverage denominators.

The current website source is available in this repository. This is separate from the experimental evaluation code, complete data archive and paper release.

## Design principles

- Lead with a concrete scientific question, original laboratory footage and evidence.
- Use a warm light background, restrained green accents, readable tables and consistent type hierarchy.
- Keep the first navigation small: Experiments, Results, Methodology, Collaborate.
- Expose complexity through variables, conditions, budgets, feedback and repeats within each task.
- Show progress states accurately; separate project affiliations, operating laboratory sites and future collaborations.
- Maintain useful static pages, mobile layouts, keyboard controls and reduced-motion behavior as interaction grows.

## References informing this plan

- [Agents’ Last Exam](https://agents-last-exam.org/): clear project introduction, concrete task examples, evidence and participation paths.
- [SkillsBench](https://www.skillsbench.ai/leaderboard): model/harness identity, versioned results and matched comparison views.
- [ASI-Bench](https://asibench.apexin.ai/): task documentation, evaluation workflow and contribution instructions.
- [SWE-bench](https://www.swebench.com/): separate evaluation subsets and explicit comparison settings.
- [ARC Prize](https://arcprize.org/leaderboard): performance/resource interpretation and evaluation policies.
- [Terminal-Bench](https://www.tbench.ai/): focused navigation and distinct model/agent fields.

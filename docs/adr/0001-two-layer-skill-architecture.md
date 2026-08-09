# Two-Layer Skill Architecture

Categories with real machinery (desktop-automation, agent-browser) are split into an
operation layer — a session daemon, CLI wrapper, or shared scripts — and business skills,
user-facing workflows built on top. Dependencies run one way: business skills decide *what*
and *when*; the operation layer decides *how*. This keeps business skills small and
replaceable while the machinery is built and maintained once, instead of one monolithic
skill per domain that duplicates the driver. The rule describes categories that have
machinery; categories without one (content-manager, frontend) are not gaps.

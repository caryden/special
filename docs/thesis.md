# Unbundling Open Source

## The Bundle

An open source library is a bundle of five forms of knowledge:

1. **Specification** — what the code should do (behavioral contracts, edge cases, invariants)
2. **Evaluation** — how to verify it works (test suites, benchmarks, cross-validation)
3. **Translation** — working code in a specific language for a specific platform
4. **Curation** — which algorithms, defaults, and trade-offs to choose (design decisions)
5. **Trust / Provenance** — who wrote it, who reviewed it, what it was validated against

These five components are bundled together because, historically, they had to be. Writing a specification without an implementation was academic. Writing tests without code to run them against was pointless. Translation — turning knowledge into working code — was expensive enough that it made economic sense to do it once and distribute the result.

The bundle is held together by the cost of translation.

## The Pattern

When a cost in a value chain collapses, bundles break apart. The components that were held together by that cost get recombined in new ways, and the locus of value shifts.

This pattern recurs across industries:

**Newspapers.** A newspaper bundled reporting, opinion, classifieds, comics, and sports into a single physical product. The bundle was held together by the cost of printing and physical distribution. When the internet collapsed distribution cost, the bundle broke. Craigslist took classifieds. ESPN took sports. Bloggers took opinion. The reporting that had been cross-subsidized by classified revenue was left exposed.

**Music.** An album bundled 12 tracks into a single product. The bundle was held together by the economics of physical media — pressing a CD cost the same whether it had 1 track or 14. When digital distribution collapsed the marginal cost of distributing a single track, iTunes unbundled albums into singles. Streaming unbundled further: you don't buy tracks, you rent access to all of them.

**Television.** Cable bundled 200 channels into a single subscription. The bundle was held together by the cost of building and maintaining physical cable infrastructure. When streaming collapsed distribution cost, consumers could subscribe to individual channels (Netflix, HBO, Disney+). The cross-subsidy that funded niche channels broke.

**Enterprise software.** Suites bundled dozens of features into monolithic products. The bundle was held together by the cost of integration and deployment. When cloud infrastructure collapsed deployment cost, suites unbundled into SaaS products, then further into APIs. Stripe is unbundled payment processing. Twilio is unbundled telephony.

The universal pattern:

```
Bundle → Cost collapse → Unbundling → Cross-subsidies break → Re-bundling at a new layer
```

The economic logic is well-documented. Stigler observed that bundling is profitable when consumer valuations are negatively correlated — you bundle because different customers want different pieces. Adams and Yellen formalized mixed bundling strategies. Bakos and Brynjolfsson showed that bundling information goods is almost always profitable when marginal cost is near zero, because bundling reduces variance in willingness to pay. Thompson's Aggregation Theory describes how platforms that reduce transaction costs commoditize supply and capture value through demand aggregation.

The critical insight from this literature: **bundling is an economic strategy, not a technical necessity.** When the economics change, the bundles change.

## Translation Cost Is Collapsing

AI coding agents are driving the cost of turning a specification into working code toward zero. Not to zero — but toward it, fast enough that the economic logic of the current bundle is breaking.

The evidence from this project's experiments:

- **108/108 tests passing** across Python, Rust, and Go translations of an optimization subset — generated from a skill specification, not hand-written
- **Subset extraction works.** 3 of 21 nodes extracted and translated independently, producing correct self-contained code with zero external dependencies
- **The skill format matches reference correctness at prompt-level cost.** SPEC format achieves 100% correctness at 0.6x the token cost of giving the agent the full reference implementation. The skill format (progressive disclosure) achieves 100% at 0.4x cost.
- **Cross-model transfer works.** Knowledge distilled from one agent session successfully guided a different model to one-shot the same translation

When translation was expensive, it made sense to do it once (in one language, by one team) and distribute the compiled artifact. When translation is cheap, the artifact becomes a cached projection from a richer upstream representation — and the cache can be regenerated on demand, in any language, containing only the subset needed.

## What Remains When Translation Is Free

If translation cost approaches zero, the bundle breaks. But not everything in the bundle was translation. Four components retain their value:

**Specification** — defining what correct behavior means, including edge cases, is irreducibly hard. The `-2 ** 2` precedence question, the signed-zero division behavior, the threshold for convergence — these are design decisions that require domain expertise. They don't get cheaper with better AI.

**Evaluation** — test suites, cross-validation against reference implementations (scipy, Optim.jl), provenance annotations documenting where each test vector came from. Evaluation is what makes the specification trustworthy. Without it, a spec is just an opinion.

**Curation** — choosing which algorithms to include, what defaults to set, which trade-offs to make. An optimization library's value isn't just that it implements Nelder-Mead; it's that someone chose good default tolerances, picked a robust line search, and decided how convergence should be checked.

**Trust / Provenance** — knowing that test vectors were verified against scipy v1.17.0, that the reference was cross-validated against Optim.jl v2.0.0, that specific edge cases were found and documented through translation feedback.

The component that loses value is the translation itself — the specific `.js`, `.rs`, or `.py` file. That file is now a projection that can be regenerated from the specification + evaluation + curation + provenance upstream.

## Skills: Packaging the Residual

If the valuable residual is specification, evaluation, curation, and trust, then the distribution format should package exactly those things. That's what a skill is.

A skill is a self-contained directory containing:

- **Behavioral specifications** — per-node `spec.md` files with test vectors, edge cases, and `@provenance` annotations
- **A dependency graph** — `@depends-on` declarations that enable subset extraction (need Nelder-Mead but not L-BFGS? Take 3 nodes, not 21)
- **Translation hints** — per-language `to-{lang}.md` files encoding the distilled experience of prior translations (e.g., "Rust: use `&[f64]` not `Vec<f64>` for read-only inputs")
- **A verified reference implementation** — TypeScript code with 100% test coverage, consulted only when the spec is ambiguous
- **Provenance** — which libraries were cross-validated, when, by whom

An AI agent reads the skill and produces native code in the target language. The output has zero external dependencies, contains only the requested subset of functionality, and is verified against the same test vectors that define the specification.

The skill is to AI coding agents what source code is to compilers: the input representation from which executable output is generated.

## The Feedback Loop

Translation agents don't just consume skills — they improve them. When an agent hits a spec ambiguity during translation, that friction is a structured signal:

| Signal | Example | Where it improves the skill |
|--------|---------|---------------------------|
| Missing test vector | Agent iterated 3 times on whitespace-in-exponent edge case | `nodes/tokenizer/spec.md` |
| Precedence ambiguity | Python agent diverged on `-2 ** 2` | `nodes/evaluate/spec.md` |
| Translation friction | Rust borrow checker rejected `&[Token]` for recursive descent | `nodes/parser/to-rust.md` |
| Performance data | Go evaluator 2.3x slower than Rust on same vectors | `nodes/evaluator/to-go.md` |

This works because skills have a precise address for feedback. An issue doesn't say "the library has a problem" — it says "`tokenizer/to-rust.md` needs a hint about lifetime annotations." The node graph makes feedback actionable.

The `to-{lang}.md` files are explicitly designed to accumulate this wisdom. Each consumer's friction becomes the next consumer's shortcut. The behavioral specs (test vectors) remain stable; the translation guides evolve.

This creates two orthogonal improvement vectors: better models improve execution quality; richer skills improve knowledge quality. Skills become self-improving artifacts where every consumption is a potential contribution.

The project's [spec-ambiguity issues](https://github.com/caryden/special/issues?q=label%3Aspec-ambiguity) contain concrete examples of this loop in action — spec ambiguities discovered during translation, documented as structured improvements.

## Honest Limitations

This thesis is an exploration, not a proof. Several important caveats:

**Performance-critical code.** Libraries whose value is implementation-level optimization — BLAS, FFmpeg, zlib — cannot be captured by behavioral specs alone. The *how* is the value. A skill can include performance annotations or directives to bind to platform-native implementations, but it can't replace hand-tuned SIMD intrinsics.

**Security-sensitive implementations.** Where correctness depends on implementation details (constant-time execution, memory zeroing, side-channel resistance), behavioral tests are insufficient. The translation itself carries security properties that a spec cannot fully communicate.

**Scale is untested.** The largest skill has 21 nodes. The approach needs validation with larger graphs (50+ nodes) and deeper dependency chains. It's plausible that the progressive disclosure model breaks down at scale, or that the agent's context window becomes a bottleneck.

**Versioning is untested.** No skill has been versioned or had its behavioral contract changed yet. How skills evolve over time — and how consumers handle breaking changes to specifications — is an open question.

**The feedback loop is designed but not automated.** Translation friction has been manually documented as draft issues. The end-to-end loop (agent hits friction → structured issue filed → maintainer agent triages → PR merged → next consumer benefits) has not been demonstrated.

**This project demonstrates the concept with three skills.** Whether the pattern generalizes across domains, scales to a marketplace, and delivers on the economic thesis remains to be seen. We believe the evidence is encouraging; we don't claim it's conclusive.

## References

- Stigler, G. (1963). "United States v. Loew's Inc.: A Note on Block-Booking." *Supreme Court Review*.
- Adams, W. J., & Yellen, J. L. (1976). "Commodity Bundling and the Burden of Monopoly." *Quarterly Journal of Economics*.
- Bakos, Y., & Brynjolfsson, E. (1999). "Bundling Information Goods: Pricing, Profits, and Efficiency." *Management Science*.
- Thompson, B. "Aggregation Theory." *Stratechery*.
- Breunig, D. (2026). "A Software Library With No Code." [dbreunig.com](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html).
- Zimmermann, M., Staicu, C.-A., Tenny, C., & Pradel, M. (2019). "Small World with High Risks: A Study of Security Threats in the npm Ecosystem." *USENIX Security Symposium*.

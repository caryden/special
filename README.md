# Special

Exploring how AI coding agents change the economics of software library distribution.

## The Idea

Today's libraries ship monolithic bundles of code. You need one function, you get the whole package — plus its transitive dependencies. This creates supply chain risk, dependency hell, and platform lock-in.

AI agents can now generate correct code from reference material. What if instead of shipping code, a library shipped a **modular, tested reference implementation** that an agent translates into exactly the subset you need, in your language, with zero external dependencies?

Not "codeless libraries" exactly — **modular verified references that agents generate minimal, dependency-free native code from.**

## Current State

Brainstorming and requirements capture. See [requirements.md](requirements.md) for the full problem statement, hypotheses, and evaluation rubric.

## Origin

Predicted and then validated by [Drew Breunig's "A Software Library With No Code"](https://www.dbreunig.com/2026/01/08/a-software-library-with-no-code.html) (Jan 2026). Further informed by practical experience porting a subset of Optim.jl to TypeScript using AI agent translation with test-driven verification.

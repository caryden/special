using System;

namespace TypeO;

/// <summary>
/// Declares a function, type, or class as a named node in the dependency graph.
/// The extraction tool uses this to build the graph and compute transitive closures.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = false)]
public class NodeAttribute : Attribute
{
    public string Id { get; }
    public string[] DependsOn { get; set; } = [];
    public string Description { get; set; } = "";

    public NodeAttribute(string id)
    {
        Id = id;
    }
}

/// <summary>
/// Links a node to its test class(es). The extraction tool uses this to include
/// the correct tests when emitting a translation plan.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = true)]
public class ContractAttribute : Attribute
{
    public Type TestClass { get; }

    public ContractAttribute(Type testClass)
    {
        TestClass = testClass;
    }
}

/// <summary>
/// Provides translation guidance to the agent. These hints are included inline
/// in the generated translation plan for the relevant node.
///
/// Category allows structured hint types:
///   "platform"  — use native platform capabilities (e.g., "use platform BLAS")
///   "pattern"   — suggest target-language idiom (e.g., "use Result<T,E> in Rust")
///   "perf"      — performance expectation (e.g., "O(n log n) or better")
///   "adapt"     — requires user decision (e.g., "async model varies by target")
///   (freeform)  — any other guidance
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = true)]
public class TranslationHintAttribute : Attribute
{
    public string Hint { get; }
    public string Category { get; set; } = "";

    public TranslationHintAttribute(string hint)
    {
        Hint = hint;
    }
}

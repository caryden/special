using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using TypeO;

// TypeO Extract — Reflection-based subgraph extraction tool
//
// Usage: dotnet run -- <assembly-path> <node-id> [--source-dir <path>]
//
// Loads a compiled reference assembly, walks [Node] attributes to build the
// dependency graph, computes the transitive closure for the requested node,
// and emits a topologically sorted translation plan with inline source and tests.

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: typeo-extract <assembly-path> <node-id> [--source-dir <path>]");
    return 1;
}

var assemblyPath = args[0];
var requestedNode = args[1];
var sourceDir = args.Length > 3 && args[2] == "--source-dir" ? args[3] : null;

// Load assembly and discover nodes
var assembly = Assembly.LoadFrom(assemblyPath);
var nodes = DiscoverNodes(assembly);

if (!nodes.ContainsKey(requestedNode))
{
    Console.Error.WriteLine($"Node '{requestedNode}' not found. Available nodes:");
    foreach (var id in nodes.Keys.OrderBy(k => k))
        Console.Error.WriteLine($"  {id}");
    return 1;
}

// Compute transitive closure
var closure = ComputeClosure(requestedNode, nodes);

// Topological sort (leaves first)
var sorted = TopologicalSort(closure, nodes);

// Emit translation plan
var testCount = sorted.Sum(n => n.TestClasses.Count);
Console.WriteLine($"Translation Plan: {requestedNode}");
Console.WriteLine($"Source: {Path.GetFileName(assemblyPath)}");
Console.WriteLine($"Nodes: {sorted.Count} | Tests: {testCount} test class(es)");
Console.WriteLine();

for (int i = 0; i < sorted.Count; i++)
{
    var node = sorted[i];
    var deps = node.DependsOn.Length == 0
        ? "pure — no dependencies"
        : $"depends: {string.Join(", ", node.DependsOn)}";

    Console.WriteLine($"Task {i + 1}/{sorted.Count}: Translate node \"{node.Id}\" ({deps})");
    Console.WriteLine($"  Description: {node.Description}");
    Console.WriteLine($"  Member: {node.MemberName} in {node.DeclaringType}");

    if (node.TestClasses.Count > 0)
        Console.WriteLine($"  Tests: {string.Join(", ", node.TestClasses.Select(t => t.Name))}");

    foreach (var hint in node.Hints)
    {
        var cat = string.IsNullOrEmpty(hint.Category) ? "" : $"[{hint.Category}] ";
        Console.WriteLine($"  Hint: {cat}{hint.Hint}");
    }

    // If source directory provided, attempt to inline source
    if (sourceDir != null)
    {
        var sourceFile = FindSourceFile(sourceDir, node.DeclaringType);
        if (sourceFile != null)
            Console.WriteLine($"  Source: {sourceFile}");
    }

    Console.WriteLine();
}

return 0;

// --- Implementation ---

Dictionary<string, NodeInfo> DiscoverNodes(Assembly asm)
{
    var result = new Dictionary<string, NodeInfo>();

    foreach (var type in asm.GetExportedTypes())
    {
        // Check type-level [Node]
        var typeNode = type.GetCustomAttribute<NodeAttribute>();
        if (typeNode != null)
        {
            result[typeNode.Id] = new NodeInfo
            {
                Id = typeNode.Id,
                Description = typeNode.Description,
                DependsOn = typeNode.DependsOn,
                DeclaringType = type.FullName ?? type.Name,
                MemberName = type.Name,
                TestClasses = type.GetCustomAttributes<ContractAttribute>().Select(c => c.TestClass).ToList(),
                Hints = type.GetCustomAttributes<TranslationHintAttribute>().ToList()
            };
        }

        // Check method-level [Node]
        foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance))
        {
            var methodNode = method.GetCustomAttribute<NodeAttribute>();
            if (methodNode != null)
            {
                result[methodNode.Id] = new NodeInfo
                {
                    Id = methodNode.Id,
                    Description = methodNode.Description,
                    DependsOn = methodNode.DependsOn,
                    DeclaringType = type.FullName ?? type.Name,
                    MemberName = method.Name,
                    TestClasses = method.GetCustomAttributes<ContractAttribute>().Select(c => c.TestClass).ToList(),
                    Hints = method.GetCustomAttributes<TranslationHintAttribute>().ToList()
                };
            }
        }
    }

    return result;
}

HashSet<string> ComputeClosure(string rootId, Dictionary<string, NodeInfo> allNodes)
{
    var closure = new HashSet<string>();
    var queue = new Queue<string>();
    queue.Enqueue(rootId);

    while (queue.Count > 0)
    {
        var current = queue.Dequeue();
        if (!closure.Add(current)) continue;

        if (allNodes.TryGetValue(current, out var node))
        {
            foreach (var dep in node.DependsOn)
                queue.Enqueue(dep);
        }
        else
        {
            Console.Error.WriteLine($"Warning: dependency '{current}' not found in assembly.");
        }
    }

    return closure;
}

List<NodeInfo> TopologicalSort(HashSet<string> closure, Dictionary<string, NodeInfo> allNodes)
{
    var inClosure = allNodes
        .Where(kv => closure.Contains(kv.Key))
        .ToDictionary(kv => kv.Key, kv => kv.Value);

    var sorted = new List<NodeInfo>();
    var visited = new HashSet<string>();
    var visiting = new HashSet<string>();

    void Visit(string id)
    {
        if (visited.Contains(id)) return;
        if (visiting.Contains(id))
            throw new InvalidOperationException($"Cycle detected at node '{id}'");

        visiting.Add(id);

        if (inClosure.TryGetValue(id, out var node))
        {
            foreach (var dep in node.DependsOn)
                if (closure.Contains(dep))
                    Visit(dep);

            sorted.Add(node);
        }

        visiting.Remove(id);
        visited.Add(id);
    }

    foreach (var id in closure)
        Visit(id);

    return sorted;
}

string? FindSourceFile(string dir, string typeName)
{
    // Simple heuristic: look for .cs files matching the type name
    var shortName = typeName.Split('.').Last();
    var candidates = Directory.GetFiles(dir, "*.cs", SearchOption.AllDirectories)
        .Where(f => Path.GetFileNameWithoutExtension(f).Equals(shortName, StringComparison.OrdinalIgnoreCase))
        .ToList();
    return candidates.FirstOrDefault();
}

record NodeInfo
{
    public required string Id;
    public required string Description;
    public required string[] DependsOn;
    public required string DeclaringType;
    public required string MemberName;
    public required List<Type> TestClasses;
    public required List<TranslationHintAttribute> Hints;
}

# Ollama Model Selection

This document provides recommendations for selecting Ollama models for software development. The recommendations are based on practical experience developing the TaylorDo and MyDefrag projects using VSCodium, Opilot, and local AI models.

---

## Table of Contents

- [Purpose](#purpose)
- [Development System](#development-system)
- [Recommended Models](#recommended-models)
- [Model Roles](#model-roles)

  - [Qwen 2.5 Coder 7B](#qwen-25-coder-7b)
  - [Qwen 2.5 Coder 14B](#qwen-25-coder-14b)
  - [Qwen 3 8B](#qwen-3-8b)
  - [Qwen 3 Coder 30B](#qwen-3-coder-30b)
- [Memory Considerations](#memory-considerations)
- [Recommended Workflow](#recommended-workflow)
- [When to Use Larger Models](#when-to-use-larger-models)
- [Future Evaluation](#future-evaluation)

---

## Purpose

Different language models excel at different tasks. Selecting the appropriate model improves response quality, reduces hardware requirements, and minimizes development time.

The goal is not to use the largest model available, but to use the smallest model capable of solving the current problem efficiently.

---

## Development System

These recommendations are based on the following workstation.

| Component        | Specification           |
| ---------------- | ----------------------- |
| Operating System | Windows 11              |
| IDE              | VSCodium                |
| AI Extension     | Opilot                  |
| AI Runtime       | Ollama                  |
| GPU              | NVIDIA GeForce RTX 5060 |
| GPU Memory       | 8 GB GDDR7              |
| System Memory    | 32 GB RAM               |

---

## Recommended Models

| Model               | Recommendation | Purpose                        |
| ------------------- | :------------: | ------------------------------ |
| `qwen2.5-coder:7b`  | ⭐ Recommended | Fast coding assistance         |
| `qwen2.5-coder:14b` | ⭐ Recommended | Primary development model      |
| `qwen3:8b`          | ⭐ Recommended | Documentation and architecture |
| `qwen3-coder:30b`   |    Optional    | Deep repository reasoning      |

---

## Model Roles

### Qwen 2.5 Coder 7B

Model: `qwen2.5-coder:7b`

Use for:

- Autocomplete
- Small code changes
- Simple bug fixes
- Fast interactive development
- Routine programming questions

This model provides the fastest response time and is well suited for everyday editing.

### Qwen 2.5 Coder 14B

Model: `qwen2.5-coder:14b`

Use for:

- JavaScript
- PowerShell
- TCL
- Rust
- Parser development
- Language Server development
- Multi-file debugging
- Medium-complexity reasoning

This is the recommended default model for software development.

### Qwen 3 8B

Model: `qwen3:8b`

Use for:

- Documentation
- Technical writing
- Architecture
- Design discussions
- Planning
- Markdown generation

Although capable of coding, this model is better suited to reasoning and communication than code generation.

### Qwen 3 Coder 30B

Model: `qwen3-coder:30b`

Use for:

- Repository-wide analysis
- Deep parser debugging
- Large architectural reviews
- Long-context reasoning
- Complex refactoring

This model should be viewed as a specialist rather than the default development model.

---

## Memory Considerations

The 30B model places significantly greater demands on system resources than the smaller models.

Approximate memory requirements for common quantizations are:

| Quantization | Approximate Memory |
| ------------ | -----------------: |
| 4-bit (Q4)   |           18–20 GB |
| 5-bit (Q5)   |           22–25 GB |
| 8-bit (Q8)   |      32 GB or more |

On an RTX 5060 with 8 GB of VRAM, Ollama automatically distributes the model between GPU memory and system RAM.

Typical memory usage while running a 30B Q4 model:

| Component       | Approximate Memory |
| --------------- | -----------------: |
| Windows 11      |               4 GB |
| VSCodium        |             1–2 GB |
| Browser         |             2–3 GB |
| Ollama (30B Q4) |           18–20 GB |
| Total           |           25–29 GB |

This leaves relatively little free memory. The system remains usable, but response times are slower than with the 7B or 14B models.

---

## Recommended Workflow

| Activity                    | Recommended Model   |
| --------------------------- | ------------------- |
| Autocomplete                | `qwen2.5-coder:7b`  |
| General coding              | `qwen2.5-coder:14b` |
| Parser development          | `qwen2.5-coder:14b` |
| Language Server development | `qwen2.5-coder:14b` |
| PowerShell                  | `qwen2.5-coder:14b` |
| Rust                        | `qwen2.5-coder:14b` |
| Documentation               | `qwen3:8b`          |
| Architecture                | `qwen3:8b`          |
| Repository review           | `qwen3-coder:30b`   |

---

## When to Use Larger Models

Most development tasks do **not** require a 30B model.

Use the 14B model for:

- Syntax errors
- Routine debugging
- Code generation
- Small refactoring
- Standard parser changes

Switch to the 30B model when the task requires reasoning across multiple files or understanding complex interactions.

Examples include:

- Parser state-machine analysis
- Tokenizer-to-parser execution tracing
- Repository-wide architectural reviews
- Multi-file refactoring
- Investigating valid syntax rejected by the parser

For example, diagnosing why a syntactically valid MyDefrag statement is rejected requires tracing the complete execution path:

1. Tokenizer
2. Keyword classification
3. Fragment classifier
4. Parser dispatch
5. Statement parser
6. Diagnostic generation

This type of deep reasoning benefits from a larger model with greater reasoning capacity and context length.

---

## Future Evaluation

This document should be updated as new Ollama models become available.

Future work includes:

- Performance benchmarking
- Context window comparisons
- Quantization comparisons
- GPU layer tuning
- Multi-model workflows
- Specialized Rust and JavaScript coding models
- Recommendations for systems with 16 GB, 64 GB, and larger memory configurations

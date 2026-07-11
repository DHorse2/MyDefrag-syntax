# Opilot + Ollama Installation Guide

This document describes the recommended installation and configuration of **Opilot** with **Ollama** for local AI-assisted software development. The recommendations are based on a Windows development workstation using VSCodium and an NVIDIA RTX 5060 GPU.

---

## Table of Contents

- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
- [Tested Development System](#tested-development-system)
- [Recommended Model Configuration](#recommended-model-configuration)

  - [Fast Coding Model](#fast-coding-model)
  - [Primary Development Model](#primary-development-model)
  - [General Purpose Model](#general-purpose-model)
  - [Large Models](#large-models)
- [Configure Opilot](#configure-opilot)
- [Recommended Workflow](#recommended-workflow)
- [Shell Commands](#shell-commands)

  - [Start the Ollama Service](#start-the-ollama-service)
  - [Verify Installation](#verify-installation)
  - [List Installed Models](#list-installed-models)
  - [Download Models](#download-models)
  - [Run a Model](#run-a-model)
  - [Show Running Models](#show-running-models)
  - [Stop Models](#stop-models)
  - [Remove a Model](#remove-a-model)
  - [Display Model Information](#display-model-information)
  - [Display Help](#display-help)
  - [Typical Daily Workflow](#typical-daily-workflow)
- [Future Evaluation](#future-evaluation)

---

## Purpose

This guide describes a recommended local AI development environment using:

- VSCodium
- Opilot
- Ollama
- Local Large Language Models (LLMs)

The objective is to provide fast, private, high-quality AI assistance for software development without relying on cloud-hosted services.

---

## Prerequisites

Install the following software:

- VSCodium
- Ollama
- Opilot extension
- Git
- Node.js

Ensure the Ollama service is running before opening Opilot.

---

## Tested Development System

The recommendations in this guide have been validated on the following development workstation.

| Component        | Specification           |
| ---------------- | ----------------------- |
| Operating System | Windows 11              |
| IDE              | VSCodium                |
| AI Extension     | Opilot                  |
| AI Runtime       | Ollama                  |
| GPU              | NVIDIA GeForce RTX 5060 |
| GPU Memory       | 8 GB GDDR7 (Samsung)    |
| System Memory    | 32 GB RAM               |

This hardware provides an excellent balance between cost, performance, and local AI capability.

---

## Recommended Model Configuration

The following models are recommended for the above hardware configuration.

### Fast Coding Model

Model: `qwen2.5-coder:7b`

```powershell
ollama pull qwen2.5-coder:7b
```

Recommended for:

- Autocomplete
- Small code changes
- Quick questions
- Everyday programming

---

### Primary Development Model

Model: `qwen2.5-coder:14b`

```powershell
ollama pull qwen2.5-coder:14b
```

Recommended for:

- JavaScript
- PowerShell
- TCL
- Rust
- Parser development
- Language Server development
- Multi-file reasoning

This should become the primary development model.

---

### General Purpose Model

Model: `qwen3:8b`

```powershell
ollama pull qwen3:8b
```

Recommended for:

- Documentation
- Technical writing
- Design discussions
- Architecture
- Project planning

---

### Large Models

Model: `qwen3-coder:30b`

```powershell
ollama pull qwen3-coder:30b
```

The 30B model is optional.

Although it runs successfully on the tested hardware, it exceeds the available GPU memory and therefore uses a combination of GPU VRAM and system RAM.

This model is best reserved for:

- Repository-wide analysis
- Complex debugging
- Large architectural reviews
- Long-context reasoning

For everyday development, the 14B coding model provides the best balance between speed and reasoning quality.

---

## Configure Opilot

1. Install and start Ollama.
2. Install the Opilot extension.
3. Open the **Ollama*- activity bar.
4. Verify the downloaded models appear.
5. Open **Copilot Chat**.
6. Select the desired Ollama model.

Recommended defaults:

| Purpose             | Model               |
| ------------------- | ------------------- |
| Fast coding         | `qwen2.5-coder:7b`  |
| Primary development | `qwen2.5-coder:14b` |
| Documentation       | `qwen3:8b`          |

---

## Recommended Workflow

| Activity                    | Recommended Model            |
| --------------------------- | ---------------------------- |
| Autocomplete                | `qwen2.5-coder:7b`           |
| Everyday coding             | `qwen2.5-coder:14b`          |
| Parser debugging            | `qwen2.5-coder:14b`          |
| Language server development | `qwen2.5-coder:14b`          |
| Rust development            | `qwen2.5-coder:14b`          |
| PowerShell development      | `qwen2.5-coder:14b`          |
| Documentation               | `qwen3:8b`                   |
| Architecture                | `qwen3:8b`                   |
| Repository analysis         | `qwen3-coder:30b` (optional) |

---

## Shell Commands

### Start the Ollama Service

```powershell
ollama serve
```

### Verify Installation

```powershell
ollama --version
```

### List Installed Models

```powershell
ollama list
```

### Download Models

```powershell
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5-coder:14b
ollama pull qwen3:8b
```

Optional:

```powershell
ollama pull qwen3-coder:30b
```

### Run a Model

```powershell
ollama run qwen2.5-coder:14b
```

Exit with:

```text
/bye
```

or press **Ctrl+C**.

### Show Running Models

```powershell
ollama ps
```

### Stop Models

Stop all running models:

```powershell
ollama stop all
```

Stop a specific model:

```powershell
ollama stop qwen2.5-coder:14b
```

### Remove a Model

```powershell
ollama rm qwen2.5-coder:7b
```

### Display Model Information

```powershell
ollama show qwen2.5-coder:14b
```

### Display Help

```powershell
ollama --help
```

### Typical Daily Workflow

```powershell
# Verify installation
ollama --version

# Start Ollama (if required)
ollama serve

# Verify installed models
ollama list

# Launch the primary coding model
ollama run qwen2.5-coder:14b

# View active models
ollama ps
```

---

## Future Evaluation

Future revisions of this guide should include:

- Opilot configuration options
- Context length recommendations
- GPU layer tuning
- Performance benchmarks
- MCP integration
- Comparison with ChatGPT, Codex, and Cline
- Updated model recommendations as Ollama evolves

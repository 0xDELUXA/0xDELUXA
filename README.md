<h1 align="center">DELUXA</h1>

> Systems-level contributor focused on PyTorch, AMD ROCm on Windows, and ML infrastructure.

## Notable Contributions

<!-- CONTRIBUTIONS:START -->
<table style="width: 100%; border-collapse: collapse;">
<thead><tr><th style="padding: 12px 16px; border: 1px solid #30363d; text-align: left;">Repository</th><th style="padding: 12px 16px; border: 1px solid #30363d; text-align: left;">Contribution</th></tr></thead>
<tbody>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>huggingface/transformers</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/huggingface/transformers/pull/44507">Fix: Conditionally import `torch.distributed.fsdp` in `trainer_seq2seq.py`</a></td></tr>
<tr><td rowspan="3" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>Comfy-Org/ComfyUI</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/Comfy-Org/ComfyUI/pull/16211">quant_ops: drop the dead ROCm triton arch gate</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/Comfy-Org/ComfyUI/pull/15648">Fix: Verify aotriton kernels actually launch before enabling pytorch attention</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/Comfy-Org/ComfyUI/pull/9926">Enable fp8 ops by default on gfx1200</a></td></tr>
<tr><td rowspan="3" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>pytorch/pytorch</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/pytorch/pytorch/pull/201445">[ROCm] Keep torch_hip linked into LibTorch C++ programs on Windows</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/pytorch/pytorch/pull/199665">[ROCm] Fix hipify path handling on Windows</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/pytorch/pytorch/pull/176789">[elastic] Add Windows support for stdout/stderr redirects</a></td></tr>
<tr><td rowspan="2" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>invoke-ai/InvokeAI</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/invoke-ai/InvokeAI/commit/55923cd554c21d46008aed03cd83095133b7b21c">feat(deps): ROCm 10 on Linux and Windows from AMD's index (#9643)</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/invoke-ai/InvokeAI/commit/7001bf3780bd979b4a25c076c41f47af0c0b68f2">feat(deps): install ROCm 10 from AMD's index on Linux and Windows</a></td></tr>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>Dao-AILab/flash-attention</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/Dao-AILab/flash-attention/commit/ab5cb6e68b9203c4ce1811765a6e53dcb8bae069">[ROCM] Fix windows issues (#2385)</a></td></tr>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>triton-lang/triton</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/triton-lang/triton/pull/11227">[AMD] Stop lowering bf16 multiply to v_dot2_bf16_bf16</a></td></tr>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>vosen/ZLUDA</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/vosen/ZLUDA/pull/654">docs: clarify unofficial HIP SDK column refers to AMD nightlies</a></td></tr>
<tr><td rowspan="3" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>deepbeepmeep/WanGP</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/deepbeepmeep/WanGP/pull/2397">Refresh Windows AMD ROCm support for TheRock multi-arch wheels</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/deepbeepmeep/WanGP/pull/1518">Update `AMD-INSTALLATION.md`</a></td></tr>
<tr><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/deepbeepmeep/WanGP/pull/1491">Revise AMD installation guide</a></td></tr>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>huggingface/accelerate</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/huggingface/accelerate/pull/3962">Fix: Conditionally import `torch.distributed.algorithms.join` in `accelerator.py`</a></td></tr>
<tr><td rowspan="1" style="padding: 14px 16px; vertical-align: middle; font-size: 13px; border: 1px solid #30363d; white-space: nowrap;"><code>LykosAI/StabilityMatrix</code></td><td style="padding: 14px 16px; border: 1px solid #30363d;"><a href="https://github.com/LykosAI/StabilityMatrix/pull/1723">Fix: Pin OneTrainer ROCm bitsandbytes wheel to 0.49.1</a></td></tr>
</tbody>
</table>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/0xDELUXA/0xDELUXA/output/pacman-contribution-graph-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/0xDELUXA/0xDELUXA/output/pacman-contribution-graph.svg">
  <img alt="Pac-Man eating the contribution graph" src="https://raw.githubusercontent.com/0xDELUXA/0xDELUXA/output/pacman-contribution-graph.svg">
</picture>
<!-- CONTRIBUTIONS:END -->

---

<sub>Auto-updated via GitHub Actions</sub>

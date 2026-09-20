# GP2040-CE Custom Workspace Rules

## ⚠️ Critical Rule: Physical Hardware & Irreversible Flash Protection
- **NEVER write or flash firmware directly to physical hardware (such as `RPI-RP2` drives, microcontroller flash) without explicit confirmation from the user in the current turn.**
- Flashing firmware to physical hardware is an irreversible operation.
- Always execute in two distinct stages:
  1. **Build & Staging Stage**: Compile, test, and save the binary (`.uf2`) in `firmware/` first.
  2. **Confirmation Stage**: Report the artifact path, preview, and hardware mount status. Explicitly ask the user for confirmation (e.g., 「実機（RPI-RP2）への書き込みを実行してよろしいですか？」) before copying.

## Animated Splash Deploy Harness
- Harness script: `python tools/deploy_splash.py <gif_path>`
- Routine asset updates should be delegated to subagents using model `flash`.
- Code / driver modifications should use model `inherit` or `pro`.

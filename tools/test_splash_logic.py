#!/usr/bin/env python3
"""
Verification script for GP2040-CE Animated Splash Screen logic and header syntax.
"""

import os
import re
import sys


def test_splash_header(header_path: str):
    print(f"Testing header: {header_path}")
    assert os.path.exists(header_path), f"Header not found: {header_path}"

    with open(header_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check macros
    enabled = re.search(r"#define\s+SPLASH_ANIM_ENABLED\s+(\d+)", content)
    assert enabled and enabled.group(1) == "1", "SPLASH_ANIM_ENABLED not defined as 1"

    frame_count_match = re.search(r"#define\s+SPLASH_ANIM_FRAME_COUNT\s+(\d+)", content)
    assert frame_count_match, "SPLASH_ANIM_FRAME_COUNT not found"
    frame_count = int(frame_count_match.group(1))
    assert frame_count > 0, "FRAME_COUNT must be > 0"

    duration_match = re.search(
        r"#define\s+SPLASH_ANIM_TOTAL_DURATION_MS\s+(\d+)", content
    )
    assert duration_match, "SPLASH_ANIM_TOTAL_DURATION_MS not found"
    total_duration = int(duration_match.group(1))
    assert total_duration > 0, "TOTAL_DURATION_MS must be > 0"

    # Check delays
    delays_match = re.search(
        r"splash_anim_delays\[\d+\]\s*=\s*\{([^}]+)\};", content
    )
    assert delays_match, "splash_anim_delays array not found"
    delays = [int(x.strip()) for x in delays_match.group(1).split(",") if x.strip()]
    assert (
        len(delays) == frame_count
    ), f"Delays count {len(delays)} != {frame_count}"
    assert (
        sum(delays) == total_duration
    ), f"Sum of delays {sum(delays)} != {total_duration}"

    # Check cumulative
    cum_match = re.search(
        r"splash_anim_cumulative\[\d+\]\s*=\s*\{([^}]+)\};", content
    )
    assert cum_match, "splash_anim_cumulative array not found"
    cum = [int(x.strip()) for x in cum_match.group(1).split(",") if x.strip()]
    assert (
        len(cum) == frame_count
    ), f"Cumulative count {len(cum)} != {frame_count}"
    assert cum[-1] == total_duration, f"Final cumulative {cum[-1]} != {total_duration}"

    # Verify frame lookup simulation (simulating SplashScreen::drawScreen logic)
    print("Simulating runtime frame progression...")
    simulated_frames = []
    for t in range(0, total_duration * 2, 20):  # test 2 complete loops in 20ms steps
        loop_time = t % total_duration
        current_frame = 0
        for i in range(frame_count):
            if loop_time < cum[i]:
                current_frame = i
                break
        assert (
            0 <= current_frame < frame_count
        ), f"Invalid frame {current_frame} at {t}ms"
        simulated_frames.append(current_frame)

    assert len(set(simulated_frames)) == frame_count, "Not all frames were reached during simulation"
    print(f"[OK] Header verification passed! ({frame_count} frames, {total_duration}ms total duration)")


def test_splash_screen_cpp(cpp_path: str):
    print(f"Testing SplashScreen.cpp: {cpp_path}")
    assert os.path.exists(cpp_path), f"File not found: {cpp_path}"

    with open(cpp_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check header inclusion
    assert 'splash_anim.h' in content, "Missing splash_anim.h check"
    assert "SPLASH_ANIM_ENABLED" in content, "Missing SPLASH_ANIM_ENABLED check"
    assert "SPLASH_ANIM_TOTAL_DURATION_MS" in content, "Missing SPLASH_ANIM_TOTAL_DURATION_MS check"
    assert "splash_anim_frames[currentFrame]" in content, "Missing animated frame draw call"
    
    # Check update logic
    assert "return -1;" in content, "Missing loop return -1 for animation"

    print("[OK] SplashScreen.cpp logic verification passed!")


if __name__ == "__main__":
    if os.path.exists("headers/display/ui/screens/splash_anim.h"):
        header = "headers/display/ui/screens/splash_anim.h"
        cpp = "src/display/ui/screens/SplashScreen.cpp"
    else:
        header = "gp2040-ce/headers/display/ui/screens/splash_anim.h"
        cpp = "gp2040-ce/src/display/ui/screens/SplashScreen.cpp"

    try:
        test_splash_header(header)
        test_splash_screen_cpp(cpp)
        print("\nAll verification tests passed successfully!")
    except Exception as e:
        print(f"\nVerification failed: {e}", file=sys.stderr)
        sys.exit(1)

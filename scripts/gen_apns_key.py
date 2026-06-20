#!/usr/bin/env python3
"""
Drive `eas credentials --platform ios` non-interactively via pexpect
to generate and upload a new APNs push key for com.saedni.app.
"""
import os, sys, time
import pexpect

ARROW_DOWN  = "\x1b[B"
ARROW_UP    = "\x1b[A"
ENTER       = "\r"
SPACE       = " "

env = dict(os.environ)
env["EXPO_TOKEN"]            = os.environ.get("EXPO_TOKEN", "")
env["EXPO_APPLE_ID"]         = os.environ.get("APPLE_ID", "")
env["EXPO_APPLE_PASSWORD"]   = os.environ.get("APPLE_APP_SPECIFIC_PASSWORD", "")
env["EXPO_APPLE_TEAM_ID"]    = os.environ.get("APPLE_TEAM_ID", "226T25Z67X")
env["APPLE_TEAM_ID"]         = os.environ.get("APPLE_TEAM_ID", "226T25Z67X")
env["EAS_NO_VCS"]            = "1"
env["FORCE_COLOR"]           = "0"
env["NO_COLOR"]              = "1"
env["TERM"]                  = "dumb"

log = []

def send_and_log(child, text, label):
    log.append(f">>> SEND: {label}")
    child.send(text)

try:
    child = pexpect.spawn(
        "/home/runner/workspace/artifacts/saedni-mobile/node_modules/.bin/eas credentials --platform ios",
        cwd="/home/runner/workspace/artifacts/saedni-mobile",
        env=env,
        timeout=90,
        encoding="utf-8",
    )
    child.logfile_read = sys.stdout

    # ── Prompt 1: which credential category ─────────────────────────────────
    # Options (order varies by EAS version):
    #   "Push Notifications key" / "Distribution Certificate..."
    idx = child.expect([
        "Push Notifications",
        "Distribution",
        "which credentials",
        "What do you want to configure",
        "Which iOS credentials",
        pexpect.TIMEOUT,
    ], timeout=30)
    print(f"\n[pexpect] matched idx={idx} after start")

    if idx == 0:
        # "Push Notifications" is already highlighted or listed first → Enter
        send_and_log(child, ENTER, "select Push Notifications (already highlighted)")
    elif idx == 1:
        # "Distribution" is highlighted → Down to Push Notifications → Enter
        # (Push Notifications is typically the second item)
        send_and_log(child, ARROW_DOWN, "move to Push Notifications")
        time.sleep(0.3)
        send_and_log(child, ENTER, "select Push Notifications")
    else:
        # Catch-all: try to navigate to Push Notifications
        send_and_log(child, ARROW_DOWN, "move down (catch-all)")
        time.sleep(0.3)
        send_and_log(child, ENTER, "select (catch-all)")

    # ── Prompt 2: what to do with push key ──────────────────────────────────
    idx2 = child.expect([
        "Generate",
        "generate",
        "What would you like",
        "What do you want to do",
        pexpect.TIMEOUT,
    ], timeout=20)
    print(f"\n[pexpect] matched idx2={idx2} for action menu")
    # "Generate a new push key" should be highlighted first → Enter
    send_and_log(child, ENTER, "Generate new push key")

    # ── Apple authentication / team selection ────────────────────────────────
    # EAS may prompt for Apple ID or team selection; env vars may auto-fill
    idx3 = child.expect([
        "Apple ID",
        "team",
        "226T25Z67X",
        "succeeded",
        "successfully",
        "uploaded",
        "Generated",
        "saved",
        "error",
        "Error",
        pexpect.TIMEOUT,
        pexpect.EOF,
    ], timeout=60)
    print(f"\n[pexpect] matched idx3={idx3} during Apple auth/completion")

    if idx3 in (0,):   # Apple ID prompt
        print("[pexpect] Got Apple ID prompt — env var should fill this")
        send_and_log(child, ENTER, "confirm Apple ID from env")
        child.expect([pexpect.TIMEOUT, pexpect.EOF, "succeeded", "uploaded", "error"], timeout=60)

    if idx3 in (1, 2):  # team selection
        print("[pexpect] Got team prompt — pressing Enter to confirm")
        send_and_log(child, ENTER, "confirm team")
        child.expect([pexpect.TIMEOUT, pexpect.EOF, "succeeded", "uploaded", "Generated", "error"], timeout=60)

    # ── Collect remaining output ─────────────────────────────────────────────
    try:
        rest = child.read_nonblocking(size=4096, timeout=10)
        print(f"\n[pexpect] tail: {rest}")
    except Exception:
        pass

    child.close()
    print(f"\n[pexpect] exit status: {child.exitstatus}")

except pexpect.TIMEOUT as e:
    print(f"\n[pexpect] TIMEOUT — partial output above; child buffer: {child.before!r}")
    child.close(force=True)
except pexpect.EOF as e:
    print(f"\n[pexpect] EOF — process ended; child buffer: {child.before!r}")
    if child.isalive():
        child.close(force=True)
except Exception as e:
    print(f"\n[pexpect] exception: {e}")

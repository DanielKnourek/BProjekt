#!/bin/bash
# This script runs on the HOST
# It ensures that OpenOCD/ESP32 udev rules are installed so that the vscode user has permissions.

RULE_FILE="/etc/udev/rules.d/61-openocd-extra.rules"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
SKIP_FILE="$DIR/.skip_host_rules"

if [ -f "$SKIP_FILE" ]; then
    echo "Skipping udev rules installation because $SKIP_FILE exists."
    exit 0
fi

# Helper function to run a command with elevation (non-interactive sudo or pkexec)
run_elevated() {
    if sudo -n true 2>/dev/null; then
        sudo -n "$@"
    elif command -v pkexec >/dev/null 2>&1; then
        pkexec "$@"
    else
        return 1
    fi
}

# 1. Ensure udevd is running (especially for WSL)
UDEVD_STARTED=0
if ! ps aux | grep -v grep | grep -q udevd; then
    echo "udevd is not running. Attempting to start it..."
    UDEVD_BIN=""
    [ -f /usr/lib/systemd/systemd-udevd ] && UDEVD_BIN="/usr/lib/systemd/systemd-udevd"
    [ -z "$UDEVD_BIN" ] && [ -f /lib/systemd/systemd-udevd ] && UDEVD_BIN="/lib/systemd/systemd-udevd"
    
    if [ -n "$UDEVD_BIN" ]; then
        if run_elevated "$UDEVD_BIN" --daemon; then
            echo "udevd started successfully."
            UDEVD_STARTED=1
            sleep 1
        else
            echo "Note: Could not start udevd automatically (requires elevation)."
        fi
    else
        echo "Warning: Could not find systemd-udevd binary."
    fi
else
    echo "udevd is already running."
fi

# 2. Check and Install rules if missing
RULES_INSTALLED=0
if [ ! -f "$RULE_FILE" ]; then
    echo "Installing OpenOCD udev rules to host /etc/udev/rules.d/..."
    if run_elevated bash -c "cp '$DIR'/61-openocd-extra.rules /etc/udev/rules.d/"; then
        echo "Rules copied successfully."
        RULES_INSTALLED=1
    else
        echo ""
        echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        echo "ERROR: Could not install udev rules automatically."
        echo "Sudo requires a password, and no GUI authenticator was found (or it was cancelled)."
        echo "Please run the following command manually in your host terminal:"
        echo ""
        echo "  sudo bash .devcontainer/esp/udev_rules/install_host_rules.sh"
        echo ""
        echo "Alternatively, you can skip this check by creating this file:"
        echo "  $SKIP_FILE"
        echo "  touch .devcontainer/esp/udev_rules/.skip_host_rules"
        echo ""
        echo "After running this, you can rebuild/reopen the devcontainer."
        echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        echo ""
        exit 1
    fi
else
    echo "OpenOCD udev rules already present on host."
fi

# 3. Reload and Trigger if daemon is running and we just started it or installed rules
if ps aux | grep -v grep | grep -q udevd; then
    if [ $UDEVD_STARTED -eq 1 ] || [ $RULES_INSTALLED -eq 1 ] || [ ! -f "$RULE_FILE" ]; then
        echo "Reloading udev rules and triggering..."
        run_elevated udevadm control --reload-rules 2>/dev/null || echo "Note: udevadm reload failed (normal on WSL)"
        run_elevated udevadm trigger 2>/dev/null || echo "Note: udevadm trigger failed (normal on WSL)"
    fi
fi

#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "This script configures passwordless sudo permissions for Xandminer services."

# 1. Ask for the username
read -p "Enter the username that runs the Xandminer application: " TARGET_USER

# 2. Verify the user exists
if id "$TARGET_USER" >/dev/null 2>&1; then
    echo "User '$TARGET_USER' verified."
else
    echo "Error: User '$TARGET_USER' does not exist."
    exit 1
fi

# 3. Define the rules
# We use the full path to systemctl (/usr/bin/systemctl or /bin/systemctl)
# Using a wildcard for the services is not recommended for strict security; explicit paths are better.
FILE_CONTENT="# Allow $TARGET_USER to control xandminer services without a password
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl start xandminer.service
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop xandminer.service
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl start xandminerd.service
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop xandminerd.service
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl start pod.service
$TARGET_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop pod.service
"

# 4. Write to a separate file in /etc/sudoers.d/
OUTPUT_FILE="/etc/sudoers.d/xandminer-permissions"

echo "$FILE_CONTENT" > "$OUTPUT_FILE"

# 5. Set correct permissions (sudoers files must be 0440)
chmod 0440 "$OUTPUT_FILE"

# 6. Verify syntax (safety check)
if visudo -c -f "$OUTPUT_FILE"; then
    echo "---------------------------------------------------"
    echo "Success! Permissions applied for user '$TARGET_USER'."
    echo "Configuration saved to: $OUTPUT_FILE"
else
    echo "Error: Sudoers syntax check failed. Removing the file to prevent lockout."
    rm "$OUTPUT_FILE"
    exit 1
fi
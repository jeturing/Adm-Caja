#!/usr/bin/env bash
set -euo pipefail

# install_az_agent.sh
# Usage: run as root. The script will create a system user `azagent`, download
# and install the Azure DevOps agent into /opt/azagent, configure it using PAT
# (recommended for unattended) or SSH (requires public key uploaded to Azure)
# and install a systemd unit to run the agent as a service.

DEFAULT_URL="https://dev.azure.com/"
DEFAULT_POOL="Default"
AGENT_ROOT="/opt/azagent"
DEFAULT_VERSION="4.261.0"

echo "Azure DevOps Self-Hosted Agent installer"

read -rp "Server URL [${DEFAULT_URL}]: " AZDO_URL
AZDO_URL=${AZDO_URL:-$DEFAULT_URL}

read -rp "Agent pool [${DEFAULT_POOL}]: " AGENT_POOL
AGENT_POOL=${AGENT_POOL:-$DEFAULT_POOL}

read -rp "Agent name [$(hostname)]: " AGENT_NAME
AGENT_NAME=${AGENT_NAME:-$(hostname)}

read -rp "Agent version to download [${DEFAULT_VERSION}]: " AGENT_VERSION
AGENT_VERSION=${AGENT_VERSION:-$DEFAULT_VERSION}

echo "Choose authentication method:"
select AUTH in "pat" "ssh"; do
  case $AUTH in
    pat|ssh) break ;;
    *) echo "Choose 1 or 2." ;;
  esac
done

if [ "$AUTH" = "pat" ]; then
  # read PAT securely
  read -rsp $'Enter Personal Access Token (input hidden): ' AZDO_PAT
  echo
  if [ -z "$AZDO_PAT" ]; then
    echo "PAT is empty; aborting." >&2
    exit 1
  fi
fi

if [ "$AUTH" = "ssh" ]; then
  echo "SSH chosen. You must have uploaded the public key to Azure DevOps (user or project)"
  read -rp "Provide path to existing private key to use (or leave empty to generate new at ${AGENT_ROOT}/.ssh/id_rsa): " SSH_KEY_PATH
  SSH_KEY_PATH=${SSH_KEY_PATH:-}
fi

if [ "$EUID" -ne 0 ]; then
  echo "This installer must be run as root." >&2
  exit 1
fi

echo "Creating system user 'azagent' (if missing) and directories..."
if ! id -u azagent >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$AGENT_ROOT" --shell /bin/bash azagent
fi
mkdir -p "$AGENT_ROOT"
chown -R azagent:azagent "$AGENT_ROOT"
chmod 750 "$AGENT_ROOT"

echo "Downloading Azure DevOps agent v${AGENT_VERSION}..."
AGENT_PKG="vsts-agent-linux-x64-${AGENT_VERSION}.tar.gz"
AGENT_URL="https://vstsagentpackage.azureedge.net/agent/${AGENT_VERSION}/${AGENT_PKG}"
TMPDIR=$(mktemp -d)
pushd "$TMPDIR" >/dev/null
if ! command -v curl >/dev/null 2>&1; then
  apt-get update && apt-get install -y curl ca-certificates || true
fi
echo "Fetching $AGENT_URL"
curl -fsSLO "$AGENT_URL"
tar -xzf "$AGENT_PKG"
popd >/dev/null

echo "Extracting agent to ${AGENT_ROOT}..."
cp -R "$TMPDIR"/* "$AGENT_ROOT/"
chown -R azagent:azagent "$AGENT_ROOT"

# Prepare SSH key if requested
if [ "$AUTH" = "ssh" ]; then
  sudo -u azagent mkdir -p "$AGENT_ROOT/.ssh"
  chmod 700 "$AGENT_ROOT/.ssh"
  if [ -n "$SSH_KEY_PATH" ]; then
    if [ -f "$SSH_KEY_PATH" ]; then
      cp "$SSH_KEY_PATH" "$AGENT_ROOT/.ssh/id_rsa"
      chown azagent:azagent "$AGENT_ROOT/.ssh/id_rsa"
      chmod 600 "$AGENT_ROOT/.ssh/id_rsa"
    else
      echo "Provided private key path does not exist: $SSH_KEY_PATH" >&2
      exit 1
    fi
  else
    # generate new key for azagent
    sudo -u azagent ssh-keygen -t rsa -b 4096 -f "$AGENT_ROOT/.ssh/id_rsa" -N ''
    chmod 600 "$AGENT_ROOT/.ssh/id_rsa"
    chmod 644 "$AGENT_ROOT/.ssh/id_rsa.pub"
    echo "Public key generated at ${AGENT_ROOT}/.ssh/id_rsa.pub. Add this public key to Azure DevOps and press Enter to continue."
    sudo -u azagent cat "$AGENT_ROOT/.ssh/id_rsa.pub"
    read -rp $'Press Enter after you have added the public key to Azure DevOps...'
  fi
fi

echo "Configuring the agent (running as user azagent)..."
cd "$AGENT_ROOT"
if [ "$AUTH" = "pat" ]; then
  # Unattended config with PAT
  sudo -u azagent bash -lc "./config.sh --unattended --url '${AZDO_URL}' --auth pat --token '${AZDO_PAT}' --pool '${AGENT_POOL}' --agent '${AGENT_NAME}' --work _work --acceptteeeula --runasservice"
else
  # SSH flow: run interactive config but we auto-answer known prompts with expect if available
  if command -v expect >/dev/null 2>&1; then
    cat > "$AGENT_ROOT/_auto_expect.exp" <<'EOF'
#!/usr/bin/expect -f
set timeout 300
spawn ./config.sh --url "${env(AZDO_URL)}" --agent "${env(AGENT_NAME)}" --pool "${env(AGENT_POOL)}" --work _work --acceptteeeula --runasservice
expect {
  -re "Enter authentication type.*" { send "ssh\r"; exp_continue }
  -re "Enter personal access token.*" { send "\r"; exp_continue }
  -re "Enter agent pool.*" { send "\r"; exp_continue }
  -re "Enter replace.*" { send "N\r"; exp_continue }
  -re "Add an SSH public key.*" { send "y\r"; exp_continue }
  -re "Enter the path for the private key file.*" { send "${AGENT_ROOT}/.ssh/id_rsa\r"; exp_continue }
  -re "Enter the passphrase for the private key.*" { send "\r"; exp_continue }
  eof { }
}
EOF
    chown azagent:azagent "$AGENT_ROOT/_auto_expect.exp"
    chmod +x "$AGENT_ROOT/_auto_expect.exp"
    # Run the expect script as azagent
    sudo -u azagent env AZDO_URL="$AZDO_URL" AGENT_NAME="$AGENT_NAME" AGENT_POOL="$AGENT_POOL" AGENT_ROOT="$AGENT_ROOT" expect "$AGENT_ROOT/_auto_expect.exp" || true
  else
    echo "'expect' not installed. Running interactive config. Answer prompts to select SSH and supply key path: ${AGENT_ROOT}/.ssh/id_rsa"
    sudo -u azagent ./config.sh --url "$AZDO_URL" --agent "$AGENT_NAME" --pool "$AGENT_POOL" --work _work --acceptteeeula --runasservice
  fi
fi

echo "Installing systemd service unit..."
cat > /etc/systemd/system/azagent.service <<EOF
[Unit]
Description=Azure DevOps Agent (azagent)
After=network.target

[Service]
ExecStart=${AGENT_ROOT}/bin/runsvc.sh
User=azagent
WorkingDirectory=${AGENT_ROOT}
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable azagent.service || true
systemctl restart azagent.service || true

echo "Cleanup temporary files"
rm -rf "$TMPDIR"

echo "Installation complete. Check agent status with: systemctl status azagent.service"
echo "Check agent logs under ${AGENT_ROOT}/_diag for details."

exit 0

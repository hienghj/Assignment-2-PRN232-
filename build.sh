#!/usr/bin/env bash
# Install .NET 9 SDK
curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 9.0
export PATH="$HOME/.dotnet:$PATH"
export DOTNET_ROOT="$HOME/.dotnet"

# Publish the app
dotnet publish -c Release -o out

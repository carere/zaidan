#!/usr/bin/env bash

set -euo pipefail

repository_root="$(pwd)"
apt_root="${repository_root}/.cloudflare/apt"
library_root="${repository_root}/.cloudflare/playwright-deps"

mkdir -p \
  "${apt_root}/lists/partial" \
  "${apt_root}/cache/archives/partial" \
  "${library_root}"

apt_options=(
  -o "Dir::State::Lists=${apt_root}/lists"
  -o "Dir::Cache=${apt_root}/cache"
  -o Debug::NoLocking=true
)

packages=(
  libasound2t64
  libatk-bridge2.0-0t64
  libatk1.0-0t64
  libatspi2.0-0t64
  libcairo2
  libcups2t64
  libdbus-1-3
  libdrm2
  libgbm1
  libglib2.0-0t64
  libnspr4
  libnss3
  libpango-1.0-0
  libx11-6
  libxcb1
  libxcomposite1
  libxdamage1
  libxext6
  libxfixes3
  libxkbcommon0
  libxrandr2
)

apt-get "${apt_options[@]}" update

cd "${library_root}"
apt-get "${apt_options[@]}" download "${packages[@]}"

for archive in ./*.deb; do
  dpkg-deb --extract "${archive}" .
done

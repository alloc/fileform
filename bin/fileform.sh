#!/usr/bin/env bash
set -e
node "$(dirname `realpath "$0"`)/../dist/cli.js" $@
[[ -z "$2" ]] || cd "$2"

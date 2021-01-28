#!/usr/bin/env bash
if node "$(dirname `realpath "$0"`)/../dist/cli.js" $@
then [[ -z "$2" ]] || cd "$2"
fi

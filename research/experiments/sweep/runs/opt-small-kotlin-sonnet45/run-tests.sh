#!/bin/bash
cd "$(dirname "$0")"
gradle test 2>&1 | tee test-output.txt

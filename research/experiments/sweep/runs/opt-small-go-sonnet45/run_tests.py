#!/usr/bin/env python3
import subprocess
import sys

result = subprocess.run(['go', 'test', '-v'], capture_output=True, text=True)
print(result.stdout)
print(result.stderr, file=sys.stderr)
sys.exit(result.returncode)

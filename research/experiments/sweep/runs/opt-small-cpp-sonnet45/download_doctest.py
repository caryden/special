#!/usr/bin/env python3
import urllib.request

url = "https://raw.githubusercontent.com/doctest/doctest/v2.4.11/doctest/doctest.h"
output = "include/doctest.h"

print(f"Downloading {url}...")
urllib.request.urlretrieve(url, output)
print(f"Saved to {output}")

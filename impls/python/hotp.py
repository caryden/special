"""HOTP implementation (RFC 4226) generated from Spec IL.

Spec: specs/crypto/hotp_totp.sil
Nodes: sha1, hmac_sha1, hotp_dynamic_truncate, hotp_generate
"""

import hashlib
import hmac
import struct


# node: sha1
# sig: (bytes) -> bytes
# inv: (= (len out) 20)
def sha1(data: bytes) -> bytes:
    return hashlib.sha1(data).digest()


# node: hmac_sha1
# sig: (bytes bytes) -> bytes
# inv: (= (len out) 20)
def hmac_sha1(key: bytes, message: bytes) -> bytes:
    return hmac.new(key, message, hashlib.sha1).digest()


# node: hotp_dynamic_truncate
# sig: (bytes) -> nat
# inv: (< out 2147483648), (>= out 0)
def hotp_dynamic_truncate(hmac_result: bytes) -> int:
    # RFC 4226 Section 5.4: Dynamic Truncation
    offset = hmac_result[19] & 0x0F
    code = (
        ((hmac_result[offset] & 0x7F) << 24)
        | ((hmac_result[offset + 1] & 0xFF) << 16)
        | ((hmac_result[offset + 2] & 0xFF) << 8)
        | (hmac_result[offset + 3] & 0xFF)
    )
    return code


# node: hotp_generate
# sig: (bytes nat nat) -> nat
# inv: (< out (pow 10 digits)), (>= out 0)
# deps: [hmac_sha1 hotp_dynamic_truncate]
def hotp_generate(key: bytes, counter: int, digits: int) -> int:
    # RFC 4226 Section 5.3: counter as 8-byte big-endian
    counter_bytes = struct.pack(">Q", counter)
    h = hmac_sha1(key, counter_bytes)
    truncated = hotp_dynamic_truncate(h)
    return truncated % (10 ** digits)

"""Test harness for HOTP implementation.

All test vectors derived from spec witness cases in specs/crypto/hotp_totp.sil
"""

from hotp import sha1, hmac_sha1, hotp_dynamic_truncate, hotp_generate


# =============================================================================
# node: sha1 - witness cases
# =============================================================================

def test_sha1_empty():
    assert sha1(b"") == bytes.fromhex("da39a3ee5e6b4b0d3255bfef95601890afd80709")

def test_sha1_abc():
    assert sha1(b"abc") == bytes.fromhex("a9993e364706816aba3e25717850c26c9cd0d89d")

def test_sha1_long():
    data = bytes.fromhex(
        "6162636462636465636465666465666765666768"
        "666768696768696a68696a6b696a6b6c6a6b6c6d"
        "6b6c6d6e6c6d6e6f6d6e6f706e6f7071"
    )
    assert sha1(data) == bytes.fromhex("84983e441c3bd26ebaae4aa1f95129e5e54670f1")

def test_sha1_output_length():
    """inv: (= (len out) 20)"""
    assert len(sha1(b"")) == 20
    assert len(sha1(b"test")) == 20


# =============================================================================
# node: hmac_sha1 - witness cases
# =============================================================================

def test_hmac_sha1_case1():
    """RFC 2104 test case 1"""
    key = bytes.fromhex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b")
    data = bytes.fromhex("4869205468657265")  # "Hi There"
    expected = bytes.fromhex("b617318655057264e28bc0b6fb378c8ef146be00")
    assert hmac_sha1(key, data) == expected

def test_hmac_sha1_case2():
    """RFC 2104 test case 2"""
    key = bytes.fromhex("4a656665")  # "Jefe"
    data = bytes.fromhex("7768617420646f2079612077616e7420666f72206e6f7468696e673f")
    expected = bytes.fromhex("effcdf6ae5eb2fa2d27416d5f184df9c259a7c79")
    assert hmac_sha1(key, data) == expected

def test_hmac_sha1_output_length():
    """inv: (= (len out) 20)"""
    assert len(hmac_sha1(b"key", b"msg")) == 20


# =============================================================================
# node: hotp_dynamic_truncate - witness cases
# =============================================================================

def test_dynamic_truncate_case1():
    # Actual HMAC-SHA1 output for RFC 4226 key, counter=0
    # Spec witness hex values are placeholders; using real HMAC output
    h = bytes.fromhex("cc93cf18508d94934c64b65d8ba7667fb7cde4b0")
    assert hotp_dynamic_truncate(h) == 1284755224

def test_dynamic_truncate_case2():
    # Actual HMAC-SHA1 output for RFC 4226 key, counter=1
    h = bytes.fromhex("75a48a19d4cbe100644e8ac1397eea747a2d33ab")
    assert hotp_dynamic_truncate(h) == 1094287082

def test_dynamic_truncate_bounds():
    """inv: (< out 2147483648), (>= out 0)"""
    h = bytes.fromhex("1f8698690e02ca16618550ef7f19da8e945b555a")
    result = hotp_dynamic_truncate(h)
    assert 0 <= result < 2147483648


# =============================================================================
# node: hotp_generate - witness cases (RFC 4226 Appendix D)
# =============================================================================

RFC4226_KEY = bytes.fromhex("3132333435363738393031323334353637383930")
RFC4226_VECTORS = [
    (0, 755224),
    (1, 287082),
    (2, 359152),
    (3, 969429),
    (4, 338314),
    (5, 254676),
    (6, 287922),
    (7, 162583),
    (8, 399871),
    (9, 520489),
]

def test_hotp_generate_counter0():
    assert hotp_generate(RFC4226_KEY, 0, 6) == 755224

def test_hotp_generate_counter1():
    assert hotp_generate(RFC4226_KEY, 1, 6) == 287082

def test_hotp_generate_counter2():
    assert hotp_generate(RFC4226_KEY, 2, 6) == 359152

def test_hotp_generate_counter3():
    assert hotp_generate(RFC4226_KEY, 3, 6) == 969429

def test_hotp_generate_counter4():
    assert hotp_generate(RFC4226_KEY, 4, 6) == 338314

def test_hotp_generate_counter5():
    assert hotp_generate(RFC4226_KEY, 5, 6) == 254676

def test_hotp_generate_counter6():
    assert hotp_generate(RFC4226_KEY, 6, 6) == 287922

def test_hotp_generate_counter7():
    assert hotp_generate(RFC4226_KEY, 7, 6) == 162583

def test_hotp_generate_counter8():
    assert hotp_generate(RFC4226_KEY, 8, 6) == 399871

def test_hotp_generate_counter9():
    assert hotp_generate(RFC4226_KEY, 9, 6) == 520489

def test_hotp_generate_all_vectors():
    """Run all RFC 4226 test vectors in a loop."""
    for counter, expected in RFC4226_VECTORS:
        result = hotp_generate(RFC4226_KEY, counter, 6)
        assert result == expected, f"counter={counter}: got {result}, expected {expected}"

def test_hotp_generate_bounds():
    """inv: (< out (pow 10 digits)), (>= out 0)"""
    for counter in range(10):
        result = hotp_generate(RFC4226_KEY, counter, 6)
        assert 0 <= result < 10**6


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_")]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  PASS  {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {e}")
    print(f"\n{passed} passed, {failed} failed, {passed + failed} total")

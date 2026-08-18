#!/usr/bin/env python3
"""Fail closed when mobile TLS pins no longer match the production chain."""

from __future__ import annotations

import argparse
import base64
import hashlib
import re
import subprocess
import sys
from pathlib import Path

PIN_ARRAY_PATTERN = re.compile(
    r"publicKeyHashes\s*:\s*\[(?P<pins>.*?)\]", re.DOTALL
)
BASE64_SHA256_PATTERN = re.compile(r"['\"]([A-Za-z0-9+/]{43}=)['\"]")
PEM_PATTERN = re.compile(
    br"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----", re.DOTALL
)


class VerificationError(RuntimeError):
    """A safe, actionable TLS pin verification failure."""


def run(command: list[str], *, input_data: bytes | None = None) -> bytes:
    result = subprocess.run(
        command,
        input=input_data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
    )
    if result.returncode != 0:
        executable = Path(command[0]).name
        raise VerificationError(f"{executable} failed while inspecting TLS pins")
    return result.stdout


def configured_pins(source: Path) -> set[str]:
    try:
        contents = source.read_text(encoding="utf-8")
    except OSError as error:
        raise VerificationError(f"could not read pin source: {source}") from error

    match = PIN_ARRAY_PATTERN.search(contents)
    if not match:
        raise VerificationError("publicKeyHashes array was not found in pin source")

    pins = set(BASE64_SHA256_PATTERN.findall(match.group("pins")))
    if not pins:
        raise VerificationError("no SHA-256 SPKI pins were found in pin source")
    return pins


def live_chain_pins(host: str) -> set[str]:
    chain = run(
        [
            "openssl",
            "s_client",
            "-showcerts",
            "-connect",
            f"{host}:443",
            "-servername",
            host,
            "-verify_return_error",
            "-verify_hostname",
            host,
        ],
        input_data=b"",
    )
    certificates = PEM_PATTERN.findall(chain)
    if not certificates:
        raise VerificationError("no certificates were returned by the TLS endpoint")

    pins: set[str] = set()
    for certificate in certificates:
        public_key = run(
            ["openssl", "x509", "-pubkey", "-noout"], input_data=certificate
        )
        public_key_der = run(
            ["openssl", "pkey", "-pubin", "-outform", "DER"],
            input_data=public_key,
        )
        pins.add(base64.b64encode(hashlib.sha256(public_key_der).digest()).decode())
    return pins


def abbreviated(pin: str) -> str:
    return f"{pin[:12]}…"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify that a configured React Native SPKI pin matches the live TLS chain."
    )
    parser.add_argument("--host", required=True)
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()

    try:
        expected = configured_pins(args.source)
        active = live_chain_pins(args.host)
    except (VerificationError, subprocess.TimeoutExpired) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    matches = expected.intersection(active)
    if not matches:
        print(
            f"ERROR: no configured mobile SSL pin matches the live {args.host} chain "
            f"(configured={len(expected)}, live={len(active)})",
            file=sys.stderr,
        )
        return 1

    print(
        f"OK: {len(matches)} mobile SSL pin match(es) for {args.host}: "
        + ", ".join(sorted(abbreviated(pin) for pin in matches))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Validator for Tatra Sales and Engineering test modules.
Verifies Draft-7 schema and checks for answer key distribution bias (no all-A).
"""

import sys
import json
from pathlib import Path
from collections import Counter

try:
    import jsonschema
except ImportError:
    jsonschema = None

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schema" / "test_schema.json"
TESTS_DIR = Path(__file__).resolve().parent.parent / "data" / "tests"

def validate_file(p, schema):
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    errs = []
    if jsonschema:
        v = jsonschema.Draft7Validator(schema)
        for e in v.iter_errors(data):
            errs.append(f"Schema violation: {e.message}")
    
    questions = data.get("questions", [])
    if len(questions) < 8 or len(questions) > 12:
        errs.append(f"Expected 8-12 questions, got {len(questions)}")

    keys = []
    for q in questions:
        k = q.get("correct_key")
        keys.append(k)
        opt_keys = [o.get("key") for o in q.get("options", [])]
        if k not in opt_keys:
            errs.append(f"[{q.get('id')}] correct_key '{k}' not in options: {opt_keys}")
        for ok in opt_keys:
            if ok != k and f"wrong_{ok}" not in q.get("explanations", {}):
                errs.append(f"[{q.get('id')}] Missing explanation for distractor 'wrong_{ok}'")

    # Anti-bias check: no key represents > 50%
    counts = Counter(keys)
    if len(questions) >= 8 and max(counts.values()) > (len(questions) * 0.5):
        errs.append(f"Key distribution bias detected: {dict(counts)}")

    return errs

def main():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    files = sorted(list(TESTS_DIR.glob("*.json"))) if TESTS_DIR.exists() else []
    print(f"Validating {len(files)} Tatra Sales and Engineering test file(s)...")
    passed = 0
    for f in files:
        errs = validate_file(f, schema)
        if not errs:
            print(f"  [PASS] {f.name}")
            passed += 1
        else:
            print(f"  [FAIL] {f.name}: {errs}")
    print(f"Summary: {passed}/{len(files)} Passed.")
    if passed < len(files): sys.exit(1)

if __name__ == "__main__":
    main()

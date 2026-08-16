#!/usr/bin/env python3
"""Split a -U0 git diff into focus-ring-only hunks vs everything else.

A hunk is "focus" only if EVERY added/removed line is part of the focus-ring
work. Mixed hunks are reported, never auto-reverted.
"""
import re, subprocess, sys

FOCUS = re.compile(r'focus-ring|--focus|outline-offset|outline:\s*(var\(--focus|none)')
# lines the halo work moved around that don't literally say "focus-ring"
ALLOW = re.compile(r'^\s*(box-shadow|outline|outline-offset)\s*:|^\s*var\(--focus-ring-color\);|^\s*$')

paths = sys.argv[1:]
diff = subprocess.run(['git', 'diff', '-U0', '--'] + paths,
                      capture_output=True, text=True, check=True).stdout

files = []          # (header_lines, [ (hunk_lines, is_focus) ])
cur_header, cur_hunks, cur = None, [], None

for line in diff.splitlines(keepends=True):
    if line.startswith('diff --git'):
        if cur is not None:
            cur_hunks.append(cur); cur = None
        if cur_header is not None:
            files.append((cur_header, cur_hunks))
        cur_header, cur_hunks = [line], []
    elif line.startswith('@@'):
        if cur is not None:
            cur_hunks.append(cur)
        cur = [line]
    elif cur is not None:
        cur.append(line)
    else:
        cur_header.append(line)
if cur is not None:
    cur_hunks.append(cur)
if cur_header is not None:
    files.append((cur_header, cur_hunks))

focus_patch, mixed = [], []
n_focus = n_other = 0

for header, hunks in files:
    keep = []
    for h in hunks:
        changed = [l for l in h[1:] if l[:1] in '+-']
        if not changed:
            continue
        hits = sum(1 for l in changed if FOCUS.search(l))
        if hits == len(changed):
            keep.append(h); n_focus += 1
        elif hits > 0:
            mixed.append((header[0].strip(), h)); n_other += 1
        else:
            n_other += 1
    if keep:
        focus_patch.extend(header)
        for h in keep:
            focus_patch.extend(h)

open('focus-revert.patch', 'w').write(''.join(focus_patch))
print(f"pure focus hunks : {n_focus}")
print(f"other hunks      : {n_other}")
print(f"MIXED hunks      : {len(mixed)}  <-- need manual handling")
for name, h in mixed:
    print(f"\n--- {name}\n{''.join(h)[:600]}")

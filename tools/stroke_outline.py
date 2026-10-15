"""Convert stroked SVG paths into filled outlines.

GNOME recolours symbolic icons by overriding their *fill*. Glyphs drawn as
strokes (as Lucide's are) therefore cannot be shipped as symbolic icons
directly. This module turns a stroke with round caps and round joins into a
filled shape: every segment becomes a quadrilateral and every vertex a
circle, all wound the same way so the non-zero fill rule draws their union.

Only the standard library is used.
"""

import math
import re

_TOKEN = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?")
_ARGS = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7, "Z": 0}

# Maximum distance, in path units, between a curve and its flattened form.
TOLERANCE = 0.02


def _tokens(d):
    raw = _TOKEN.findall(d)
    out, command, count = [], None, 0
    for t in raw:
        if t.isalpha():
            command, count = t, 0
            out.append(t)
            continue
        # Inside an arc, the 4th and 5th numbers are single-digit flags that
        # can run together with the next number ("0 011.5 2").
        if command and command.upper() == "A" and count % 7 in (3, 4) and len(t) > 1 and t[0] in "01" \
                and not t.startswith(("0.", "1.")):
            out.append(t[0])
            rest = t[1:]
            count += 1
            if count % 7 == 4 and len(rest) > 1 and rest[0] in "01" and not rest.startswith(("0.", "1.")):
                out.append(rest[0])
                rest = rest[1:]
                count += 1
            out.append(rest)
            count += 1
            continue
        out.append(t)
        count += 1
    return out


def _segments(length):
    return max(2, min(64, math.ceil(math.sqrt(length / TOLERANCE) / 2)))


def _cubic(p0, p1, p2, p3):
    length = math.dist(p0, p1) + math.dist(p1, p2) + math.dist(p2, p3)
    n = _segments(length)
    pts = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        pts.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return pts


def _quadratic(p0, p1, p2):
    c1 = (p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1]))
    c2 = (p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1]))
    return _cubic(p0, c1, c2, p2)


def _arc(p0, rx, ry, phi, large, sweep, p1):
    """Flatten an SVG elliptical arc (endpoint parametrisation, SVG 1.1 F.6.5)."""
    if math.dist(p0, p1) < 1e-9:
        return []
    if rx == 0 or ry == 0:
        return [p1]
    rx, ry = abs(rx), abs(ry)
    cos, sin = math.cos(math.radians(phi)), math.sin(math.radians(phi))
    dx, dy = (p0[0] - p1[0]) / 2, (p0[1] - p1[1]) / 2
    x1, y1 = cos * dx + sin * dy, -sin * dx + cos * dy
    scale = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
    if scale > 1:
        rx, ry = rx * math.sqrt(scale), ry * math.sqrt(scale)
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    k = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        k = -k
    cx1, cy1 = k * rx * y1 / ry, -k * ry * x1 / rx
    cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2
    cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2

    def angle(ux, uy, vx, vy):
        return math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)

    start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
    delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
    if not sweep and delta > 0:
        delta -= 2 * math.pi
    elif sweep and delta < 0:
        delta += 2 * math.pi

    n = _segments(abs(delta) * max(rx, ry))
    pts = []
    for i in range(1, n + 1):
        a = start + delta * i / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        pts.append((cos * x - sin * y + cx, sin * x + cos * y + cy))
    pts[-1] = p1
    return pts


def flatten(d):
    """Parse a path and return its subpaths as (points, closed) pairs."""
    tokens = _tokens(d)
    subpaths = []
    pts = []
    cur = start = (0.0, 0.0)
    last_ctrl, last_cmd = None, None
    i = 0
    command = None
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
            if command in "Zz":
                if pts:
                    subpaths.append((pts, True))
                pts, cur = [], start
                last_cmd = "Z"
                continue
        n = _ARGS[command.upper()]
        args = [float(t) for t in tokens[i:i + n]]
        i += n
        rel = command.islower()
        c = command.upper()
        ox, oy = cur if rel else (0.0, 0.0)

        if c == "M":
            if pts:
                subpaths.append((pts, False))
            cur = start = (ox + args[0], oy + args[1])
            pts = [cur]
            command = "l" if rel else "L"  # Later pairs are line-tos.
            last_ctrl = None
        elif c in "LHV":
            if c == "L":
                cur = (ox + args[0], oy + args[1])
            elif c == "H":
                cur = ((cur[0] if rel else 0) + args[0], cur[1])
            else:
                cur = (cur[0], (cur[1] if rel else 0) + args[0])
            pts.append(cur)
            last_ctrl = None
        elif c in "CS":
            if c == "C":
                c1 = (ox + args[0], oy + args[1])
                c2, end = (ox + args[2], oy + args[3]), (ox + args[4], oy + args[5])
            else:
                c1 = (2 * cur[0] - last_ctrl[0], 2 * cur[1] - last_ctrl[1]) \
                    if last_ctrl and last_cmd in "CS" else cur
                c2, end = (ox + args[0], oy + args[1]), (ox + args[2], oy + args[3])
            pts += _cubic(cur, c1, c2, end)
            last_ctrl, cur = c2, end
        elif c in "QT":
            if c == "Q":
                q = (ox + args[0], oy + args[1])
                end = (ox + args[2], oy + args[3])
            else:
                q = (2 * cur[0] - last_ctrl[0], 2 * cur[1] - last_ctrl[1]) \
                    if last_ctrl and last_cmd in "QT" else cur
                end = (ox + args[0], oy + args[1])
            pts += _quadratic(cur, q, end)
            last_ctrl, cur = q, end
        elif c == "A":
            end = (ox + args[5], oy + args[6])
            pts += _arc(cur, args[0], args[1], args[2], int(args[3]), int(args[4]), end)
            cur, last_ctrl = end, None
        last_cmd = c
        if not pts:
            pts = [cur]
    if pts:
        subpaths.append((pts, False))
    return subpaths


def _fmt(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def _signed_area(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) / 2


def _polygon(poly, sign):
    if _signed_area(poly) * sign < 0:
        poly = poly[::-1]
    head, *rest = poly
    return f"M{_fmt(head[0])} {_fmt(head[1])}" + "".join(f"L{_fmt(x)} {_fmt(y)}" for x, y in rest) + "Z"


def _circle(center, r, steps=16):
    return [(center[0] + r * math.cos(2 * math.pi * k / steps),
             center[1] + r * math.sin(2 * math.pi * k / steps)) for k in range(steps)]


def outline(d, width):
    """Filled outline of `d` stroked at `width` with round caps and joins.

    Returns a path string to be drawn with the non-zero fill rule.
    """
    r = width / 2
    sign = 1  # Every piece is wound the same way.
    parts = []
    for pts, closed in flatten(d):
        # Drop consecutive duplicates.
        clean = [pts[0]]
        for p in pts[1:]:
            if math.dist(p, clean[-1]) > 1e-6:
                clean.append(p)
        if closed and len(clean) > 1 and math.dist(clean[0], clean[-1]) > 1e-6:
            clean.append(clean[0])

        for a, b in zip(clean, clean[1:]):
            length = math.dist(a, b)
            nx, ny = -(b[1] - a[1]) / length * r, (b[0] - a[0]) / length * r
            parts.append(_polygon([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny),
                                   (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)], sign))

        # Round caps and joins. Points on a smooth curve barely turn, so only
        # place a disc where the direction changes noticeably, at ends, and
        # at every point of a single-point "dot".
        for k, p in enumerate(clean):
            if 0 < k < len(clean) - 1:
                a, b = clean[k - 1], clean[k + 1]
                d1 = math.atan2(p[1] - a[1], p[0] - a[0])
                d2 = math.atan2(b[1] - p[1], b[0] - p[0])
                turn = abs((d2 - d1 + math.pi) % (2 * math.pi) - math.pi)
                if turn < math.radians(6):
                    continue
            parts.append(_polygon(_circle(p, r, 20), sign))
    return "".join(parts)

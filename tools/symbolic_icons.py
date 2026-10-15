"""Symbolic icon designs for the Ubuntu-Glass icon theme.

Symbolic icons are the small one-colour icons in the top bar, Quick Settings,
menus and application header bars. The glyphs are the ones used in the
approved mockup (Lucide outlines, ISC licence), drawn on a 24-unit grid.

Each design is a dict:

    names   icon names it is installed as
    layers  list of (kind, path) or (kind, path, options):
              kind "s" strokes the path, "f" fills it
              options: {"opacity": 0.3} dims a part (signal levels),
                       {"class": "error"} lets GNOME colour it as an error

tools/build-icons.py converts strokes into filled outlines, because GNOME
recolours symbolic icons through their fill.
"""


def circle(x, y, r):
    return f"M{x - r} {y}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0"


def rect(x, y, w, h, r):
    return (f"M{x + r} {y}h{w - 2 * r}a{r} {r} 0 0 1 {r} {r}v{h - 2 * r}"
            f"a{r} {r} 0 0 1 {-r} {r}h{2 * r - w}a{r} {r} 0 0 1 {-r} {-r}"
            f"v{2 * r - h}a{r} {r} 0 0 1 {r} {-r}z")


DIM = {"opacity": 0.3}

ICONS = []

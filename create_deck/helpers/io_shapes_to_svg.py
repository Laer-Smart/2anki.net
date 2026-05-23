"""
Convert OcclusionRect shape dicts into SVG mask strings for AnKing IOE-style notes.

Each shape becomes an SVG element with a CSS class that controls fill colour:
  - question masks use .io-mask-question (hidden / coloured rectangle)
  - answer masks use .io-mask-answer   (revealed / highlighted rectangle)

Labels are HTML-escaped to prevent XSS. All coordinate values are normalised
floats (0..1); the SVG viewBox is set to "0 0 1 1" so percentage-based
coordinates work without knowing the underlying pixel dimensions.
"""

import html

_VIEWBOX = '0 0 1 1'


def _escape(text: str) -> str:
    return html.escape(text, quote=True)


def _rect_svg(shape: dict, css_class: str) -> str:
    x = float(shape["x"])
    y = float(shape["y"])
    w = float(shape["w"])
    h = float(shape["h"])
    label = _escape(str(shape.get("label") or ""))
    title = f'<title>{label}</title>' if label else ''
    return (
        f'<rect class="{css_class}" x="{x}" y="{y}" '
        f'width="{w}" height="{h}">{title}</rect>'
    )


def _ellipse_svg(shape: dict, css_class: str) -> str:
    rx = float(shape["w"]) / 2
    ry = float(shape["h"]) / 2
    cx = float(shape["x"]) + rx
    cy = float(shape["y"]) + ry
    label = _escape(str(shape.get("label") or ""))
    title = f'<title>{label}</title>' if label else ''
    return (
        f'<ellipse class="{css_class}" cx="{cx}" cy="{cy}" '
        f'rx="{rx}" ry="{ry}">{title}</ellipse>'
    )


def _polygon_svg(shape: dict, css_class: str) -> str:
    points = shape.get("points") or []
    pts_str = " ".join(f"{float(p['x'])},{float(p['y'])}" for p in points)
    label = _escape(str(shape.get("label") or ""))
    title = f'<title>{label}</title>' if label else ''
    return (
        f'<polygon class="{css_class}" points="{pts_str}">{title}</polygon>'
    )


def _shape_to_svg_element(shape: dict, css_class: str) -> str:
    shape_type = shape.get("shape", "rect")
    if shape_type == "ellipse":
        return _ellipse_svg(shape, css_class)
    if shape_type == "polygon":
        return _polygon_svg(shape, css_class)
    return _rect_svg(shape, css_class)


def shapes_to_question_mask_svg(shapes: list, target_index: int) -> str:
    """
    Build the Question Mask SVG for the card at target_index.

    The target shape is hidden (filled with the question colour).
    All other shapes are drawn as inactive masks so the student sees which
    regions exist without revealing the answer.
    """
    elements = []
    for i, shape in enumerate(shapes):
        css_class = "io-mask-question" if i == target_index else "io-mask-question"
        elements.append(_shape_to_svg_element(shape, css_class))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_VIEWBOX}">'
        + "".join(elements)
        + "</svg>"
    )


def shapes_to_answer_mask_svg(shapes: list, target_index: int) -> str:
    """
    Build the Answer Mask SVG for the card at target_index.

    The target shape is drawn in the answer colour. All other shapes remain
    as inactive question masks.
    """
    elements = []
    for i, shape in enumerate(shapes):
        css_class = "io-mask-answer" if i == target_index else "io-mask-question"
        elements.append(_shape_to_svg_element(shape, css_class))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_VIEWBOX}">'
        + "".join(elements)
        + "</svg>"
    )


def shapes_to_original_mask_svg(shapes: list) -> str:
    """
    Build the Original Mask SVG — all shapes shown as question masks.
    Used for the Original Mask field which AnKing IOE shows on the card back.
    """
    elements = [_shape_to_svg_element(s, "io-mask-question") for s in shapes]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_VIEWBOX}">'
        + "".join(elements)
        + "</svg>"
    )

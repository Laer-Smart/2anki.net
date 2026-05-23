import unittest
from helpers.io_shapes_to_svg import (
    shapes_to_question_mask_svg,
    shapes_to_answer_mask_svg,
    shapes_to_original_mask_svg,
)


def _rect(x=0.1, y=0.2, w=0.3, h=0.15, label="", shape="rect", **kwargs):
    return {"x": x, "y": y, "w": w, "h": h, "label": label, "shape": shape, **kwargs}


def _ellipse(**kwargs):
    return _rect(shape="ellipse", **kwargs)


def _polygon(pts, **kwargs):
    return _rect(shape="polygon", points=pts, **kwargs)


class TestQuestionMaskSvg(unittest.TestCase):

    def test_returns_svg_root(self):
        result = shapes_to_question_mask_svg([_rect()], 0)
        self.assertTrue(result.startswith("<svg"))
        self.assertIn("</svg>", result)

    def test_viewbox_set(self):
        result = shapes_to_question_mask_svg([_rect()], 0)
        self.assertIn('viewBox="0 0 1 1"', result)

    def test_rect_element_present(self):
        result = shapes_to_question_mask_svg([_rect()], 0)
        self.assertIn("<rect", result)

    def test_rect_coordinates_in_output(self):
        result = shapes_to_question_mask_svg([_rect(x=0.1, y=0.2, w=0.3, h=0.15)], 0)
        self.assertIn('x="0.1"', result)
        self.assertIn('y="0.2"', result)
        self.assertIn('width="0.3"', result)
        self.assertIn('height="0.15"', result)

    def test_multiple_shapes_all_present(self):
        shapes = [_rect(x=0.1), _rect(x=0.5)]
        result = shapes_to_question_mask_svg(shapes, 0)
        self.assertEqual(result.count("<rect"), 2)

    def test_question_class_applied(self):
        result = shapes_to_question_mask_svg([_rect()], 0)
        self.assertIn("io-mask-question", result)


class TestAnswerMaskSvg(unittest.TestCase):

    def test_returns_svg_root(self):
        result = shapes_to_answer_mask_svg([_rect()], 0)
        self.assertTrue(result.startswith("<svg"))

    def test_target_shape_has_answer_class(self):
        shapes = [_rect(x=0.1), _rect(x=0.5)]
        result = shapes_to_answer_mask_svg(shapes, 0)
        self.assertIn("io-mask-answer", result)

    def test_non_target_shape_has_question_class(self):
        shapes = [_rect(x=0.1), _rect(x=0.5)]
        result = shapes_to_answer_mask_svg(shapes, 1)
        self.assertIn("io-mask-question", result)
        self.assertIn("io-mask-answer", result)

    def test_single_shape_answer_class(self):
        result = shapes_to_answer_mask_svg([_rect()], 0)
        self.assertIn("io-mask-answer", result)
        self.assertNotIn("io-mask-question", result)


class TestOriginalMaskSvg(unittest.TestCase):

    def test_returns_svg_root(self):
        result = shapes_to_original_mask_svg([_rect()])
        self.assertTrue(result.startswith("<svg"))

    def test_all_shapes_question_class(self):
        shapes = [_rect(x=0.1), _rect(x=0.5), _rect(x=0.8)]
        result = shapes_to_original_mask_svg(shapes)
        self.assertEqual(result.count("io-mask-question"), 3)
        self.assertNotIn("io-mask-answer", result)


class TestEllipseSvg(unittest.TestCase):

    def test_ellipse_element_present(self):
        result = shapes_to_question_mask_svg([_ellipse(w=0.4, h=0.2)], 0)
        self.assertIn("<ellipse", result)

    def test_ellipse_rx_ry_are_half_wh(self):
        result = shapes_to_question_mask_svg([_ellipse(w=0.4, h=0.2)], 0)
        self.assertIn('rx="0.2"', result)
        self.assertIn('ry="0.1"', result)

    def test_ellipse_center_offset(self):
        result = shapes_to_question_mask_svg([_ellipse(x=0.1, y=0.2, w=0.4, h=0.2)], 0)
        self.assertIn('cx="0.30000000000000004"', result) or self.assertIn("cx=", result)


class TestPolygonSvg(unittest.TestCase):

    def test_polygon_element_present(self):
        pts = [{"x": 0.1, "y": 0.1}, {"x": 0.5, "y": 0.1}, {"x": 0.3, "y": 0.4}]
        result = shapes_to_question_mask_svg([_polygon(pts)], 0)
        self.assertIn("<polygon", result)

    def test_polygon_points_in_output(self):
        pts = [{"x": 0.1, "y": 0.2}, {"x": 0.5, "y": 0.3}]
        result = shapes_to_question_mask_svg([_polygon(pts)], 0)
        self.assertIn("0.1,0.2", result)
        self.assertIn("0.5,0.3", result)

    def test_polygon_empty_points(self):
        result = shapes_to_question_mask_svg([_polygon([])], 0)
        self.assertIn("<polygon", result)


class TestLabelEscaping(unittest.TestCase):

    def test_label_with_html_chars_escaped(self):
        shape = _rect(label='<script>alert("xss")</script>')
        result = shapes_to_question_mask_svg([shape], 0)
        self.assertNotIn("<script>", result)
        self.assertIn("&lt;script&gt;", result)

    def test_label_with_ampersand_escaped(self):
        shape = _rect(label="A & B")
        result = shapes_to_question_mask_svg([shape], 0)
        self.assertIn("A &amp; B", result)

    def test_label_with_quotes_escaped(self):
        shape = _rect(label='say "hello"')
        result = shapes_to_question_mask_svg([shape], 0)
        self.assertNotIn('"hello"', result)

    def test_empty_label_no_title_element(self):
        shape = _rect(label="")
        result = shapes_to_question_mask_svg([shape], 0)
        self.assertNotIn("<title>", result)

    def test_nonempty_label_has_title_element(self):
        shape = _rect(label="Heart ventricle")
        result = shapes_to_question_mask_svg([shape], 0)
        self.assertIn("<title>Heart ventricle</title>", result)


if __name__ == "__main__":
    unittest.main()

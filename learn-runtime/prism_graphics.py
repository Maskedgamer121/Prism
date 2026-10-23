"""Prism graphics: a small CMU-style graphics library and program runner.

Run as:  python -u prism_graphics.py <main.py>

The student's program runs with every name below already imported. The runner
speaks JSON lines: scenes and prints go to stdout, input events arrive on stdin.
"""
import builtins
import io
import json
import math
import sys
import traceback

_out = sys.__stdout__
_shapes = []
_FILE = 'main.py'

NAMED_COLORS = set("""aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue
darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory
khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow
yellowgreen transparent""".split())

GRADIENT_STARTS = ('center', 'top', 'bottom', 'left', 'right', 'left-top', 'right-top', 'left-bottom', 'right-bottom')


class _RGB:
    def __init__(self, red, green, blue):
        for name, v in (('red', red), ('green', green), ('blue', blue)):
            if not isinstance(v, (int, float)) or not 0 <= v <= 255:
                raise ValueError(f'rgb() values must be numbers from 0 to 255, but {name} was {v!r}')
        self.red, self.green, self.blue = int(red), int(green), int(blue)

    def css(self):
        return f'rgb({self.red}, {self.green}, {self.blue})'

    def __repr__(self):
        return f'rgb({self.red}, {self.green}, {self.blue})'


class _Gradient:
    def __init__(self, colors, start):
        if len(colors) < 2:
            raise ValueError('gradient() needs at least two colors')
        if start not in GRADIENT_STARTS:
            raise ValueError(f"gradient start must be one of {', '.join(GRADIENT_STARTS)}")
        self.colors = [_color(c, 'gradient color', allow_gradient=False) for c in colors]
        self.start = start

    def json(self):
        return {'type': 'gradient', 'colors': self.colors, 'start': self.start}

    def __repr__(self):
        return f"gradient({', '.join(repr(c) for c in self.colors)}, start={self.start!r})"


def rgb(red, green, blue):
    """A color from red, green and blue amounts (0-255)."""
    return _RGB(red, green, blue)


def gradient(*colors, start='center'):
    """A color that fades between colors. start: center, top, bottom, left, right, left-top…"""
    return _Gradient(colors, start)


def _color(value, prop, allow_gradient=True):
    if value is None:
        return None
    if isinstance(value, _RGB):
        return value.css()
    if isinstance(value, _Gradient):
        if not allow_gradient:
            raise TypeError('a gradient cannot contain another gradient')
        return value.json()
    if isinstance(value, str):
        if value.lower() in NAMED_COLORS:
            return value.lower()
        raise ValueError(f"{value!r} is not a color. Use a color name like 'red', rgb(r, g, b) or gradient(...)")
    raise TypeError(f'{prop} must be a color (a name like \'red\'), not {type(value).__name__}')


def _num(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f'{name} must be a number, but it was {value!r}')
    return value


def _rotate(x, y, cx, cy, degrees):
    if not degrees:
        return x, y
    a = math.radians(degrees)
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


def _point_in_poly(x, y, pts):
    inside = False
    n = len(pts)
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi:
            inside = not inside
        j = i
    return inside


def _segments_cross(a, b, c, d):
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    o1, o2, o3, o4 = orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)
    return (o1 * o2 < 0) and (o3 * o4 < 0)


class _App:
    def __init__(self):
        object.__setattr__(self, '_bg', 'white')
        self.stepsPerSecond = 30
        self.paused = False
        self.stopped = False
        self.width = 400
        self.height = 400

    @property
    def background(self):
        return self._bg

    @background.setter
    def background(self, value):
        _color(value, 'background')
        object.__setattr__(self, '_bg', value)

    def stop(self):
        self.stopped = True

    def __setattr__(self, name, value):
        if name == 'stepsPerSecond':
            _num(value, 'app.stepsPerSecond')
        object.__setattr__(self, name, value)


app = _App()


class Shape:
    _kind = 'shape'

    def __init__(self, fill='black', border=None, borderWidth=2, opacity=100, rotateAngle=0, dashes=False, visible=True, **extra):
        if extra:
            name = next(iter(extra))
            raise TypeError(f"{type(self).__name__}() has no property named {name!r}")
        self.fill = fill
        self.border = border
        self.borderWidth = borderWidth
        self.opacity = opacity
        self.rotateAngle = rotateAngle
        self.dashes = dashes
        self.visible = visible
        self._group = None
        _shapes.append(self)

    # -- validated style properties --
    def __setattr__(self, name, value):
        if name in ('fill', 'border'):
            _color(value, name)
        elif name in ('borderWidth', 'rotateAngle', 'lineWidth'):
            _num(value, name)
        elif name == 'opacity':
            _num(value, 'opacity')
            if not 0 <= value <= 100:
                raise ValueError(f'opacity must be between 0 and 100, but it was {value}')
        object.__setattr__(self, name, value)

    def _style(self):
        return {
            'fill': _color(self.fill, 'fill'),
            'border': _color(self.border, 'border'),
            'borderWidth': self.borderWidth,
            'opacity': self.opacity,
            'rotateAngle': self.rotateAngle,
            'dashes': bool(self.dashes),
        }

    # -- geometry every shape implements --
    def _bounds(self):
        raise NotImplementedError

    def _move(self, dx, dy):
        raise NotImplementedError

    def _outline(self):
        """Polygon approximation (unrotated) used for contains/hits."""
        l, t, r, b = self._bounds()
        return [(l, t), (r, t), (r, b), (l, b)]

    def _rotated_outline(self):
        cx, cy = self.centerX, self.centerY
        return [_rotate(x, y, cx, cy, self.rotateAngle) for x, y in self._outline()]

    @property
    def left(self):
        return self._bounds()[0]

    @left.setter
    def left(self, v):
        self._move(_num(v, 'left') - self.left, 0)

    @property
    def top(self):
        return self._bounds()[1]

    @top.setter
    def top(self, v):
        self._move(0, _num(v, 'top') - self.top)

    @property
    def right(self):
        return self._bounds()[2]

    @right.setter
    def right(self, v):
        self._move(_num(v, 'right') - self.right, 0)

    @property
    def bottom(self):
        return self._bounds()[3]

    @bottom.setter
    def bottom(self, v):
        self._move(0, _num(v, 'bottom') - self.bottom)

    @property
    def centerX(self):
        l, _, r, _ = self._bounds()
        return (l + r) / 2

    @centerX.setter
    def centerX(self, v):
        self._move(_num(v, 'centerX') - self.centerX, 0)

    @property
    def centerY(self):
        _, t, _, b = self._bounds()
        return (t + b) / 2

    @centerY.setter
    def centerY(self, v):
        self._move(0, _num(v, 'centerY') - self.centerY)

    @property
    def width(self):
        l, _, r, _ = self._bounds()
        return r - l

    @property
    def height(self):
        _, t, _, b = self._bounds()
        return b - t

    # -- methods --
    def contains(self, x, y):
        """True if the point (x, y) is inside the shape."""
        _num(x, 'x')
        _num(y, 'y')
        px, py = _rotate(x, y, self.centerX, self.centerY, -self.rotateAngle)
        return _point_in_poly(px, py, self._outline())

    def hits(self, x, y):
        """True if the point (x, y) touches the shape."""
        return self.contains(x, y)

    def hitsShape(self, other):
        """True if this shape and another shape overlap."""
        if not isinstance(other, Shape):
            raise TypeError('hitsShape() needs another shape')
        a, b = self._rotated_outline(), other._rotated_outline()
        if any(_point_in_poly(x, y, b) for x, y in a) or any(_point_in_poly(x, y, a) for x, y in b):
            return True
        for i in range(len(a)):
            for j in range(len(b)):
                if _segments_cross(a[i], a[(i + 1) % len(a)], b[j], b[(j + 1) % len(b)]):
                    return True
        return False

    def containsShape(self, other):
        """True if the other shape is completely inside this one."""
        a = self._rotated_outline()
        return all(_point_in_poly(x, y, a) for x, y in other._rotated_outline())

    def toFront(self):
        lst = self._group.children if self._group else _shapes
        lst.remove(self)
        lst.append(self)

    def toBack(self):
        lst = self._group.children if self._group else _shapes
        lst.remove(self)
        lst.insert(0, self)

    def remove(self):
        """Take the shape off the canvas."""
        lst = self._group.children if self._group else _shapes
        if self in lst:
            lst.remove(self)

    def __repr__(self):
        return f'{type(self).__name__}(centerX={self.centerX:g}, centerY={self.centerY:g})'


_ALIGNS = {
    'left-top': (0, 0), 'top': (0.5, 0), 'right-top': (1, 0), 'left': (0, 0.5), 'center': (0.5, 0.5),
    'right': (1, 0.5), 'left-bottom': (0, 1), 'bottom': (0.5, 1), 'right-bottom': (1, 1),
}


class Rect(Shape):
    def __init__(self, left, top, width, height, align='left-top', **style):
        _num(left, 'left'), _num(top, 'top'), _num(width, 'width'), _num(height, 'height')
        if width <= 0 or height <= 0:
            raise ValueError('Rect width and height must be greater than 0')
        if align not in _ALIGNS:
            raise ValueError(f"align must be one of {', '.join(_ALIGNS)}")
        ax, ay = _ALIGNS[align]
        object.__setattr__(self, '_x', left - width * ax)
        object.__setattr__(self, '_y', top - height * ay)
        object.__setattr__(self, '_w', width)
        object.__setattr__(self, '_h', height)
        super().__init__(**style)

    def _bounds(self):
        return self._x, self._y, self._x + self._w, self._y + self._h

    def _move(self, dx, dy):
        object.__setattr__(self, '_x', self._x + dx)
        object.__setattr__(self, '_y', self._y + dy)

    @Shape.width.setter
    def width(self, v):
        if _num(v, 'width') <= 0:
            raise ValueError('width must be greater than 0')
        object.__setattr__(self, '_w', v)

    @Shape.height.setter
    def height(self, v):
        if _num(v, 'height') <= 0:
            raise ValueError('height must be greater than 0')
        object.__setattr__(self, '_h', v)

    def json(self):
        return {'t': 'rect', 'left': self._x, 'top': self._y, 'width': self._w, 'height': self._h, **self._style()}


class Oval(Shape):
    def __init__(self, centerX, centerY, width, height, **style):
        _num(centerX, 'centerX'), _num(centerY, 'centerY'), _num(width, 'width'), _num(height, 'height')
        if width <= 0 or height <= 0:
            raise ValueError(f'{type(self).__name__} size must be greater than 0')
        object.__setattr__(self, '_cx', centerX)
        object.__setattr__(self, '_cy', centerY)
        object.__setattr__(self, '_w', width)
        object.__setattr__(self, '_h', height)
        super().__init__(**style)

    def _bounds(self):
        return self._cx - self._w / 2, self._cy - self._h / 2, self._cx + self._w / 2, self._cy + self._h / 2

    def _move(self, dx, dy):
        object.__setattr__(self, '_cx', self._cx + dx)
        object.__setattr__(self, '_cy', self._cy + dy)

    def _outline(self):
        return [(self._cx + self._w / 2 * math.cos(a), self._cy + self._h / 2 * math.sin(a))
                for a in (i * math.pi / 24 for i in range(48))]

    @Shape.width.setter
    def width(self, v):
        if _num(v, 'width') <= 0:
            raise ValueError('width must be greater than 0')
        object.__setattr__(self, '_w', v)

    @Shape.height.setter
    def height(self, v):
        if _num(v, 'height') <= 0:
            raise ValueError('height must be greater than 0')
        object.__setattr__(self, '_h', v)

    def json(self):
        return {'t': 'oval', 'centerX': self._cx, 'centerY': self._cy, 'width': self._w, 'height': self._h, **self._style()}


class Circle(Oval):
    def __init__(self, centerX, centerY, radius, **style):
        _num(radius, 'radius')
        if radius <= 0:
            raise ValueError('Circle radius must be greater than 0')
        super().__init__(centerX, centerY, radius * 2, radius * 2, **style)

    @property
    def radius(self):
        return self._w / 2

    @radius.setter
    def radius(self, v):
        if _num(v, 'radius') <= 0:
            raise ValueError('radius must be greater than 0')
        object.__setattr__(self, '_w', v * 2)
        object.__setattr__(self, '_h', v * 2)


class Arc(Oval):
    def __init__(self, centerX, centerY, width, height, startAngle, sweepAngle, **style):
        _num(startAngle, 'startAngle'), _num(sweepAngle, 'sweepAngle')
        object.__setattr__(self, 'startAngle', startAngle)
        object.__setattr__(self, 'sweepAngle', sweepAngle)
        super().__init__(centerX, centerY, width, height, **style)

    def _outline(self):
        pts = [(self._cx, self._cy)]
        steps = 24
        for i in range(steps + 1):
            a = math.radians(self.startAngle + self.sweepAngle * i / steps - 90)
            pts.append((self._cx + self._w / 2 * math.cos(a), self._cy + self._h / 2 * math.sin(a)))
        return pts

    def json(self):
        return {'t': 'arc', 'centerX': self._cx, 'centerY': self._cy, 'width': self._w, 'height': self._h,
                'startAngle': self.startAngle, 'sweepAngle': self.sweepAngle, **self._style()}


class Polygon(Shape):
    def __init__(self, *coords, **style):
        if len(coords) < 6 or len(coords) % 2:
            raise TypeError('Polygon needs at least 3 points as x1, y1, x2, y2, x3, y3, …')
        for i, c in enumerate(coords):
            _num(c, f'point value #{i + 1}')
        object.__setattr__(self, 'pointList', [[coords[i], coords[i + 1]] for i in range(0, len(coords), 2)])
        super().__init__(**style)

    def _points(self):
        return [(p[0], p[1]) for p in self.pointList]

    def _bounds(self):
        pts = self._points()
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    def _move(self, dx, dy):
        object.__setattr__(self, 'pointList', [[x + dx, y + dy] for x, y in self._points()])

    def _outline(self):
        return self._points()

    def addPoint(self, x, y):
        self.pointList.append([_num(x, 'x'), _num(y, 'y')])

    def json(self):
        return {'t': 'polygon', 'points': [v for p in self._points() for v in p], **self._style()}


class RegularPolygon(Polygon):
    def __init__(self, centerX, centerY, radius, points, **style):
        _num(centerX, 'centerX'), _num(centerY, 'centerY'), _num(radius, 'radius')
        if not isinstance(points, int) or points < 3:
            raise ValueError('points must be a whole number of at least 3')
        object.__setattr__(self, '_cx', centerX)
        object.__setattr__(self, '_cy', centerY)
        object.__setattr__(self, '_r', radius)
        object.__setattr__(self, '_n', points)
        Shape.__init__(self, **style)

    def _points(self):
        return [(self._cx + self._r * math.sin(2 * math.pi * i / self._n), self._cy - self._r * math.cos(2 * math.pi * i / self._n))
                for i in range(self._n)]

    def _move(self, dx, dy):
        object.__setattr__(self, '_cx', self._cx + dx)
        object.__setattr__(self, '_cy', self._cy + dy)

    @property
    def radius(self):
        return self._r

    @radius.setter
    def radius(self, v):
        object.__setattr__(self, '_r', _num(v, 'radius'))

    @property
    def points(self):
        return self._n

    @points.setter
    def points(self, v):
        object.__setattr__(self, '_n', int(v))

    @property
    def pointList(self):
        return [list(p) for p in self._points()]


class Star(RegularPolygon):
    def __init__(self, centerX, centerY, radius, points, roundness=None, **style):
        if roundness is None:
            ratio = math.cos(2 * math.pi / points) / math.cos(math.pi / points) if points >= 3 else 0.4
            roundness = max(20, min(80, round(ratio * 100)))
        object.__setattr__(self, 'roundness', _num(roundness, 'roundness'))
        super().__init__(centerX, centerY, radius, points, **style)

    def _points(self):
        inner = self._r * self.roundness / 100
        pts = []
        for i in range(self._n * 2):
            r = self._r if i % 2 == 0 else inner
            a = math.pi * i / self._n
            pts.append((self._cx + r * math.sin(a), self._cy - r * math.cos(a)))
        return pts


class Line(Shape):
    def __init__(self, x1, y1, x2, y2, lineWidth=2, arrowStart=False, arrowEnd=False, **style):
        for name, v in (('x1', x1), ('y1', y1), ('x2', x2), ('y2', y2)):
            _num(v, name)
        object.__setattr__(self, 'x1', x1)
        object.__setattr__(self, 'y1', y1)
        object.__setattr__(self, 'x2', x2)
        object.__setattr__(self, 'y2', y2)
        object.__setattr__(self, 'arrowStart', arrowStart)
        object.__setattr__(self, 'arrowEnd', arrowEnd)
        super().__init__(**style)
        self.lineWidth = lineWidth

    def _bounds(self):
        return min(self.x1, self.x2), min(self.y1, self.y2), max(self.x1, self.x2), max(self.y1, self.y2)

    def _move(self, dx, dy):
        for a, d in (('x1', dx), ('x2', dx), ('y1', dy), ('y2', dy)):
            object.__setattr__(self, a, getattr(self, a) + d)

    def _outline(self):
        dx, dy = self.x2 - self.x1, self.y2 - self.y1
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length * self.lineWidth / 2, dx / length * self.lineWidth / 2
        return [(self.x1 + nx, self.y1 + ny), (self.x2 + nx, self.y2 + ny), (self.x2 - nx, self.y2 - ny), (self.x1 - nx, self.y1 - ny)]

    def json(self):
        style = self._style()
        return {'t': 'line', 'x1': self.x1, 'y1': self.y1, 'x2': self.x2, 'y2': self.y2, 'lineWidth': self.lineWidth,
                'arrowStart': bool(self.arrowStart), 'arrowEnd': bool(self.arrowEnd), **style}


class Label(Shape):
    def __init__(self, value, centerX, centerY, size=12, font='arial', bold=False, italic=False, align='center', **style):
        _num(centerX, 'centerX'), _num(centerY, 'centerY'), _num(size, 'size')
        object.__setattr__(self, 'value', value)
        object.__setattr__(self, 'size', size)
        object.__setattr__(self, 'font', font)
        object.__setattr__(self, 'bold', bold)
        object.__setattr__(self, 'italic', italic)
        if align not in _ALIGNS:
            raise ValueError(f"align must be one of {', '.join(_ALIGNS)}")
        ax, ay = _ALIGNS[align]
        w, h = self._text_size()
        object.__setattr__(self, '_cx', centerX + w * (0.5 - ax))
        object.__setattr__(self, '_cy', centerY + h * (0.5 - ay))
        style.setdefault('borderWidth', 1)
        super().__init__(**style)

    def _text_size(self):
        return len(str(self.value)) * self.size * (0.6 if self.bold else 0.55), self.size

    def _bounds(self):
        w, h = self._text_size()
        return self._cx - w / 2, self._cy - h / 2, self._cx + w / 2, self._cy + h / 2

    def _move(self, dx, dy):
        object.__setattr__(self, '_cx', self._cx + dx)
        object.__setattr__(self, '_cy', self._cy + dy)

    def json(self):
        return {'t': 'label', 'value': str(self.value), 'centerX': self._cx, 'centerY': self._cy, 'size': self.size,
                'font': str(self.font), 'bold': bool(self.bold), 'italic': bool(self.italic), **self._style()}


class Group(Shape):
    """Several shapes that move together."""

    def __init__(self, *shapes):
        object.__setattr__(self, 'children', [])
        object.__setattr__(self, 'visible', True)
        object.__setattr__(self, 'rotateAngle', 0)
        object.__setattr__(self, '_group', None)
        _shapes.append(self)
        for s in shapes:
            self.add(s)

    def __setattr__(self, name, value):
        if name in ('fill', 'border', 'opacity', 'borderWidth', 'dashes'):
            for c in self.children:
                setattr(c, name, value)
            return
        if name == 'rotateAngle' and value:
            raise ValueError('Groups cannot be rotated; rotate the shapes inside instead')
        object.__setattr__(self, name, value)

    def add(self, shape):
        if not isinstance(shape, Shape):
            raise TypeError('Group.add() needs a shape')
        if shape._group:
            shape._group.children.remove(shape)
        elif shape in _shapes:
            _shapes.remove(shape)
        object.__setattr__(shape, '_group', self)
        self.children.append(shape)

    def clear(self):
        self.children.clear()

    def _bounds(self):
        if not self.children:
            return 0, 0, 0, 0
        bs = [c._bounds() for c in self.children]
        return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)

    def _move(self, dx, dy):
        for c in self.children:
            c._move(dx, dy)

    def contains(self, x, y):
        return any(c.visible and c.contains(x, y) for c in self.children)

    def hitsShape(self, other):
        return any(c.hitsShape(other) for c in self.children)

    def json_list(self):
        out = []
        for c in self.children:
            if not c.visible:
                continue
            if isinstance(c, Group):
                out.extend(c.json_list())
            else:
                out.append(c.json())
        return out


def distance(x1, y1, x2, y2):
    """Distance between two points."""
    return math.hypot(x2 - x1, y2 - y1)


def angleTo(x1, y1, x2, y2):
    """Angle in degrees (0 = up, clockwise) from point 1 to point 2."""
    return (math.degrees(math.atan2(x2 - x1, y1 - y2)) + 360) % 360


def getPointInDir(x, y, angle, dist):
    """The point `dist` away from (x, y) in direction `angle` (0 = up, clockwise)."""
    a = math.radians(angle)
    return x + dist * math.sin(a), y - dist * math.cos(a)


def rounded(n):
    """Rounds .5 up (Python's round() rounds .5 to the nearest even number)."""
    return math.floor(n + 0.5)


# ---------------------------------------------------------------- runner

def _emit(msg):
    if msg['type'] != 'print' and isinstance(sys.stdout, _Printer):
        sys.stdout.flush()
    _out.write(json.dumps(msg) + '\n')
    _out.flush()


class _Printer(io.TextIOBase):
    """Collects print() output and sends it a line at a time."""
    buf = ''

    def write(self, s):
        self.buf += s
        if '\n' in self.buf:
            cut = self.buf.rindex('\n') + 1
            _emit({'type': 'print', 'text': self.buf[:cut]})
            self.buf = self.buf[cut:]
        return len(s)

    def flush(self):
        if self.buf:
            _emit({'type': 'print', 'text': self.buf})
            self.buf = ''


def _scene():
    shapes = []
    for s in _shapes:
        if not s.visible:
            continue
        if isinstance(s, Group):
            shapes.extend(s.json_list())
        else:
            shapes.append(s.json())
    return {'background': _color(app.background, 'background'), 'shapes': shapes}


API_NAMES = ['Rect', 'Oval', 'Circle', 'Arc', 'Polygon', 'RegularPolygon', 'Star', 'Line', 'Label', 'Group', 'rgb',
             'gradient', 'app', 'distance', 'angleTo', 'getPointInDir', 'rounded', 'onMousePress', 'onMouseRelease',
             'onMouseMove', 'onMouseDrag', 'onKeyPress', 'onKeyRelease', 'onKeyHold', 'onStep']


def _friendly(exc):
    msg = f'{type(exc).__name__}: {exc}'.replace('.__init__()', '()')
    if isinstance(exc, NameError):
        name = getattr(exc, 'name', None) or str(exc).split("'")[1] if "'" in str(exc) else ''
        for api in API_NAMES:
            if name and api.lower() == name.lower() and api != name:
                return f"{msg}\nCase matters — did you mean {api}?"
    if isinstance(exc, TypeError) and 'missing' in str(exc) and 'positional' in str(exc):
        return f'{msg}\nCheck that you gave every number the shape needs, in the right order, separated by commas.'
    return msg


def _report(exc):
    line = None
    if isinstance(exc, SyntaxError) and exc.filename == _FILE:
        line = exc.lineno
        _emit({'type': 'error', 'message': f'SyntaxError: {exc.msg}', 'line': line})
        return
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == _FILE:
            line = frame.lineno
    _emit({'type': 'error', 'message': _friendly(exc), 'line': line})


def _no_input(*_args):
    raise RuntimeError('input() is not available in graphics programs. Use onKeyPress or onMousePress instead.')


def main():
    path = sys.argv[1]
    with open(path, encoding='utf-8') as f:
        source = f.read()
    sys.stdout = _Printer()
    builtins.input = _no_input
    env = {name: globals()[name] for name in API_NAMES if name in globals()}
    env['__name__'] = '__main__'
    try:
        exec(compile(source, _FILE, 'exec'), env)
    except SystemExit:
        pass
    except BaseException as exc:  # noqa: BLE001 — report every error to the learner
        _emit({'type': 'scene', 'scene': _scene()})
        _report(exc)
        return
    _emit({'type': 'scene', 'scene': _scene()})
    handlers = [h for h in ('onMousePress', 'onMouseRelease', 'onMouseMove', 'onMouseDrag', 'onKeyPress', 'onKeyRelease', 'onKeyHold', 'onStep') if callable(env.get(h))]
    _emit({'type': 'ready', 'handlers': handlers, 'stepsPerSecond': app.stepsPerSecond})
    if not handlers:
        return
    sps = app.stepsPerSecond
    for raw in sys.__stdin__:
        raw = raw.strip()
        if not raw:
            continue
        ev = json.loads(raw)
        kind = ev.get('type')
        try:
            if app.stopped:
                continue
            if kind in ('mousePress', 'mouseRelease', 'mouseMove', 'mouseDrag'):
                fn = env.get('on' + kind[0].upper() + kind[1:])
                if callable(fn):
                    fn(ev['x'], ev['y'])
            elif kind in ('keyPress', 'keyRelease'):
                fn = env.get('on' + kind[0].upper() + kind[1:])
                if callable(fn):
                    fn(ev['key'])
            elif kind == 'keyHold':
                fn = env.get('onKeyHold')
                if callable(fn):
                    fn(ev['keys'])
            elif kind == 'step':
                fn = env.get('onStep')
                if callable(fn):
                    for _ in range(int(ev.get('count', 1))):
                        if app.paused or app.stopped:
                            break
                        fn()
        except BaseException as exc:  # noqa: BLE001
            _emit({'type': 'scene', 'scene': _scene()})
            _report(exc)
            return
        _emit({'type': 'scene', 'scene': _scene()})
        if app.stepsPerSecond != sps:
            sps = app.stepsPerSecond
            _emit({'type': 'ready', 'handlers': handlers, 'stepsPerSecond': sps})


if __name__ == '__main__':
    main()

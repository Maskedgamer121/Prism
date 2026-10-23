import type { ApiDoc, ApiParam } from '@shared/learn'

type Lang = 'python' | 'javascript'

/** Builds the graphics reference in Python or JavaScript syntax. */
export function graphicsDocs(lang: Lang): ApiDoc[] {
  const py = lang === 'python'
  const N = py ? 'None' : 'null'
  const T = py ? 'True' : 'true'
  const F = py ? 'False' : 'false'
  // Call with style options: Python keywords vs a JS options object.
  const jsValue = (s: string) => s.replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
  const call = (name: string, args: string, opts = '') =>
    opts ? (py ? `${name}(${args}, ${opts})` : `${name}(${args}, {${jsValue(opts).replace(/(\w+)=/g, '$1: ')}})`) : `${name}(${args})`
  const sig = (name: string, args: string, opts: string) => (py ? `${name}(${args}, ${opts})` : `${name}(${args}, options)`)
  const style: ApiParam[] = [
    { name: 'fill', desc: `Inside color: a name like «'red'», «rgb(...)», «gradient(...)», or «${N}» for see-through.`, default: "'black'" },
    { name: 'border', desc: `Outline color, or «${N}» for no outline.`, default: N },
    { name: 'borderWidth', desc: 'Thickness of the outline in pixels.', default: '2' },
    { name: 'opacity', desc: 'How solid the shape is, from 0 (invisible) to 100 (solid).', default: '100' },
    { name: 'rotateAngle', desc: 'Degrees to turn the shape clockwise around its center.', default: '0' },
    { name: 'dashes', desc: `«${T}» draws the outline as dashes.`, default: F },
    { name: 'visible', desc: `«${F}» hides the shape without deleting it.`, default: T }
  ]
  const common = [
    { name: 'centerX, centerY', desc: 'Middle of the shape. Changing them moves the shape.' },
    { name: 'left, right, top, bottom', desc: 'Edges of the shape. Setting one moves the shape.' },
    { name: 'width, height', desc: 'Size of the shape.' },
    { name: 'fill, border, borderWidth', desc: 'Colors and outline.' },
    { name: 'opacity, rotateAngle, visible', desc: 'See-through amount, rotation, and whether it shows.' }
  ]
  const optsNote = py ? '' : ' Style options go in an object as the last argument: «{fill: \'red\', border: \'black\'}».'

  return [
    {
      name: 'Circle',
      category: 'Shapes',
      signature: sig('Circle', 'centerX, centerY, radius', "fill='black', border=None, borderWidth=2, opacity=100"),
      summary: `Draws a circle. You give the point in the middle and how far it reaches (the radius).${optsNote}`,
      params: [
        { name: 'centerX', desc: 'How far from the left edge the middle is (0 to 400).' },
        { name: 'centerY', desc: 'How far down from the top the middle is (0 to 400).' },
        { name: 'radius', desc: 'Distance from the middle to the edge. The circle is twice this wide.' },
        ...style
      ],
      properties: [{ name: 'radius', desc: 'Change it to grow or shrink the circle.' }, ...common],
      example: `${call('Circle', '200, 200, 100', "fill='skyBlue', border='navy', borderWidth=6")}\n${call('Circle', '200, 200, 40', "fill='white'")}`,
      tips: ['Circles are positioned by their **center**, unlike «Rect» which uses its top-left corner.']
    },
    {
      name: 'Rect',
      category: 'Shapes',
      signature: sig('Rect', 'left, top, width, height', "fill='black', border=None, borderWidth=2, opacity=100, rotateAngle=0, align='left-top'"),
      summary: `Draws a rectangle. By default «left» and «top» say where its **top-left corner** goes.${optsNote}`,
      params: [
        { name: 'left', desc: 'x position of the left edge.' },
        { name: 'top', desc: 'y position of the top edge.' },
        { name: 'width', desc: 'How wide it is.' },
        { name: 'height', desc: 'How tall it is.' },
        ...style,
        { name: 'align', desc: "Which point «left, top» refers to: «'left-top'», «'center'», «'top'», «'bottom'», «'right'», «'right-bottom'»…", default: "'left-top'" }
      ],
      properties: common,
      example: `${call('Rect', '0, 0, 100, 100', "fill='red'")}\n${call('Rect', '200, 200, 150, 80', "fill='gold', border='black', align='center'")}\n${call('Rect', '250, 30, 120, 60', "fill=None, border='green', borderWidth=4, dashes=True")}`,
      tips: ["«Rect(0, 0, 100, 100, fill='red')» puts a 100×100 red square in the top-left corner."]
    },
    {
      name: 'Oval',
      category: 'Shapes',
      signature: sig('Oval', 'centerX, centerY, width, height', "fill='black', border=None, borderWidth=2, opacity=100, rotateAngle=0"),
      summary: `Draws an oval (a stretched circle) that fits in a box of the given width and height, centered on «centerX, centerY».${optsNote}`,
      params: [
        { name: 'centerX', desc: 'x position of the middle.' },
        { name: 'centerY', desc: 'y position of the middle.' },
        { name: 'width', desc: 'Total width.' },
        { name: 'height', desc: 'Total height.' },
        ...style
      ],
      properties: common,
      example: `${call('Oval', '200, 200, 300, 120', "fill='purple'")}\n${call('Oval', '200, 200, 80, 200', "fill='orchid', opacity=70")}`
    },
    {
      name: 'Line',
      category: 'Shapes',
      signature: sig('Line', 'x1, y1, x2, y2', "fill='black', lineWidth=2, arrowStart=False, arrowEnd=False, dashes=False, opacity=100"),
      summary: 'Draws a straight line from one point to another. A line uses «fill» for its color.',
      params: [
        { name: 'x1, y1', desc: 'The starting point.' },
        { name: 'x2, y2', desc: 'The ending point.' },
        { name: 'fill', desc: 'Color of the line.', default: "'black'" },
        { name: 'lineWidth', desc: 'Thickness of the line.', default: '2' },
        { name: 'arrowStart', desc: 'Draw an arrowhead at the start.', default: F },
        { name: 'arrowEnd', desc: 'Draw an arrowhead at the end.', default: F },
        { name: 'dashes', desc: 'Draw a dashed line.', default: F },
        { name: 'opacity', desc: 'From 0 to 100.', default: '100' }
      ],
      properties: [{ name: 'x1, y1, x2, y2', desc: 'The two end points.' }, { name: 'lineWidth', desc: 'Thickness.' }, ...common.slice(0, 2)],
      example: `${call('Line', '50, 50, 350, 50', "lineWidth=4")}\n${call('Line', '50, 120, 350, 200', "fill='red', lineWidth=8, arrowEnd=True")}\n${call('Line', '50, 300, 350, 300', "fill='blue', dashes=True")}`
    },
    {
      name: 'Polygon',
      category: 'Shapes',
      signature: py ? "Polygon(x1, y1, x2, y2, x3, y3, ..., fill='black', border=None)" : 'Polygon(x1, y1, x2, y2, x3, y3, ..., options)',
      summary: 'Connects any number of points (at least 3) into a closed shape: triangles, roofs, mountains, arrows…',
      params: [
        { name: 'x1, y1', desc: 'The first corner.' },
        { name: 'x2, y2, x3, y3…', desc: 'More corners, in order around the shape.' },
        ...style
      ],
      properties: [{ name: 'pointList', desc: 'List of the corners as [x, y] pairs.' }, ...common],
      example: `# a triangle\n${call('Polygon', '200, 50, 350, 300, 50, 300', "fill='orange'")}`.replace('#', py ? '#' : '//'),
      tips: ['List the corners in order around the edge, or the lines will cross.', py ? 'Use «shape.addPoint(x, y)» to add another corner later.' : 'Use «shape.addPoint(x, y)» to add another corner later.']
    },
    {
      name: 'RegularPolygon',
      category: 'Shapes',
      signature: sig('RegularPolygon', 'centerX, centerY, radius, points', "fill='black', border=None, rotateAngle=0"),
      summary: 'A shape whose sides are all the same length: triangle (3), square (4), pentagon (5), hexagon (6), stop sign (8)…',
      params: [
        { name: 'centerX, centerY', desc: 'The middle.' },
        { name: 'radius', desc: 'Distance from the middle to each corner.' },
        { name: 'points', desc: 'How many corners (3 or more).' },
        ...style
      ],
      properties: [{ name: 'radius, points', desc: 'Size and number of corners.' }, ...common],
      example: `${call('RegularPolygon', '100, 120, 70, 3', "fill='teal'")}\n${call('RegularPolygon', '300, 120, 70, 6', "fill='gold'")}\n${call('RegularPolygon', '200, 300, 80, 8', "fill='red', rotateAngle=22.5")}`
    },
    {
      name: 'Star',
      category: 'Shapes',
      signature: sig('Star', 'centerX, centerY, radius, points', "roundness=None, fill='black', border=None, rotateAngle=0"),
      summary: 'Draws a star with any number of points.',
      params: [
        { name: 'centerX, centerY', desc: 'The middle.' },
        { name: 'radius', desc: 'Distance from the middle to each tip.' },
        { name: 'points', desc: 'How many tips.' },
        { name: 'roundness', desc: 'How fat the star is, 0–100. Small numbers make thin spikes.', default: 'depends on points' },
        ...style
      ],
      properties: [{ name: 'radius, points, roundness', desc: 'Size, tips and fatness.' }, ...common],
      example: `${call('Star', '120, 120, 80, 5', "fill='gold'")}\n${call('Star', '290, 140, 90, 12', "fill='orange', roundness=60")}\n${call('Star', '200, 300, 90, 20', "fill='crimson', roundness=15")}`
    },
    {
      name: 'Arc',
      category: 'Shapes',
      signature: sig('Arc', 'centerX, centerY, width, height, startAngle, sweepAngle', "fill='black', border=None"),
      summary: 'A slice of an oval, like a pizza slice or Pac-Man. Angles are in degrees, starting at the top (12 o’clock) and going clockwise.',
      params: [
        { name: 'centerX, centerY', desc: 'Middle of the full oval.' },
        { name: 'width, height', desc: 'Size of the full oval.' },
        { name: 'startAngle', desc: 'Where the slice starts (0 = top, 90 = right).' },
        { name: 'sweepAngle', desc: 'How many degrees the slice covers.' },
        ...style
      ],
      properties: common,
      example: `# Pac-Man!\n${call('Arc', '200, 200, 250, 250, 120, 300', "fill='gold'")}\n${call('Circle', '215, 140, 15')}`.replace('#', py ? '#' : '//')
    },
    {
      name: 'Label',
      category: 'Shapes',
      signature: sig('Label', 'value, centerX, centerY', "size=12, fill='black', bold=False, italic=False, font='arial', align='center'"),
      summary: 'Draws text centered on a point. The value can be a string or a number.',
      params: [
        { name: 'value', desc: 'The text (or number) to show.' },
        { name: 'centerX, centerY', desc: 'Where the middle of the text goes.' },
        { name: 'size', desc: 'Font size in pixels.', default: '12' },
        { name: 'fill', desc: 'Text color.', default: "'black'" },
        { name: 'bold', desc: 'Bold text.', default: F },
        { name: 'italic', desc: 'Slanted text.', default: F },
        { name: 'font', desc: "«'arial'», «'monospace'», «'serif'», «'cursive'», «'fantasy'».", default: "'arial'" },
        { name: 'align', desc: "Which point «centerX, centerY» means: «'center'», «'left'», «'right'»…", default: "'center'" },
        { name: 'border', desc: 'Outline color for the letters.', default: N }
      ],
      properties: [{ name: 'value', desc: 'Change the text that is shown.' }, { name: 'size, bold, font', desc: 'How the text looks.' }, ...common.slice(0, 2)],
      example: `${call('Label', "'Hello!', 200, 120", "size=50, bold=True, fill='mediumPurple'")}\n${call('Label', "'small and italic', 200, 200", "size=18, italic=True")}\n${call('Label', '42, 200, 290', "size=80, font='monospace', fill='teal'")}`
    },
    {
      name: 'Group',
      category: 'Shapes',
      signature: py ? 'Group(shape1, shape2, ...)' : 'Group(shape1, shape2, ...)',
      summary: 'Bundles shapes together so you can move or hide them all at once — perfect for characters made of several shapes.',
      params: [{ name: 'shape1, shape2…', desc: 'Shapes to put in the group.' }],
      properties: [{ name: 'centerX, centerY, left, top…', desc: 'Move every shape in the group together.' }, { name: 'visible', desc: 'Show or hide the whole group.' }, { name: 'children', desc: 'The shapes inside.' }],
      example: py
        ? "face = Group(\n    Circle(200, 200, 80, fill='gold'),\n    Circle(170, 180, 10),\n    Circle(230, 180, 10),\n    Arc(200, 210, 80, 60, 90, 180, fill=None, border='black')\n)\nface.centerX = 120"
        : "const face = Group(\n  Circle(200, 200, 80, {fill: 'gold'}),\n  Circle(170, 180, 10),\n  Circle(230, 180, 10)\n)\nface.centerX = 120",
      tips: [py ? 'Add more later with «group.add(shape)».' : 'Add more later with «group.add(shape)».']
    },
    {
      name: 'Style properties',
      category: 'Colors & style',
      signature: py ? "shape.fill = 'red'" : "shape.fill = 'red'",
      summary: 'Every shape has the same style properties. Set them when you create the shape, or change them later.',
      params: style,
      example: py
        ? "c = Circle(200, 200, 120, fill='lightGreen', border='darkGreen', borderWidth=10)\nc.opacity = 60\nr = Rect(100, 100, 200, 80, fill='tomato', rotateAngle=20)\nr.border = 'black'\nr.dashes = True"
        : "const c = Circle(200, 200, 120, {fill: 'lightGreen', border: 'darkGreen', borderWidth: 10})\nc.opacity = 60\nconst r = Rect(100, 100, 200, 80, {fill: 'tomato', rotateAngle: 20})\nr.border = 'black'\nr.dashes = true"
    },
    {
      name: 'gradient',
      category: 'Colors & style',
      signature: py ? "gradient(color1, color2, ..., start='center')" : "gradient(color1, color2, ..., {start: 'center'})",
      summary: 'A color that blends smoothly between two or more colors. Use it anywhere a color goes: «fill», «border» or «app.background».',
      params: [
        { name: 'color1, color2…', desc: 'Two or more colors, in order.' },
        { name: 'start', desc: "Where the first color starts: «'center'», «'top'», «'bottom'», «'left'», «'right'», «'left-top'»…", default: "'center'" }
      ],
      example: py
        ? "app.background = gradient('lightSkyBlue', 'white', start='top')\nCircle(200, 200, 120, fill=gradient('yellow', 'orange', 'red'))\nRect(0, 340, 400, 60, fill=gradient('green', 'darkGreen', start='top'))"
        : "app.background = gradient('lightSkyBlue', 'white', {start: 'top'})\nCircle(200, 200, 120, {fill: gradient('yellow', 'orange', 'red')})\nRect(0, 340, 400, 60, {fill: gradient('green', 'darkGreen', {start: 'top'})})"
    },
    {
      name: 'rgb',
      category: 'Colors & style',
      signature: 'rgb(red, green, blue)',
      summary: 'Mixes your own color from red, green and blue light. Each amount goes from 0 (none) to 255 (full).',
      params: [
        { name: 'red', desc: 'Amount of red, 0–255.' },
        { name: 'green', desc: 'Amount of green, 0–255.' },
        { name: 'blue', desc: 'Amount of blue, 0–255.' }
      ],
      example: `${call('Rect', '0, 0, 200, 200', 'fill=rgb(255, 0, 0)')}\n${call('Rect', '200, 0, 200, 200', 'fill=rgb(255, 200, 0)')}\n${call('Rect', '0, 200, 200, 200', 'fill=rgb(40, 180, 120)')}\n${call('Rect', '200, 200, 200, 200', 'fill=rgb(90, 60, 200)')}`,
      tips: ['«rgb(0, 0, 0)» is black and «rgb(255, 255, 255)» is white.']
    },
    {
      name: 'app',
      category: 'App',
      signature: "app.background = 'color'",
      summary: 'The «app» object controls the whole canvas.',
      params: [
        { name: 'app.background', desc: 'Color (or gradient) behind everything.', default: "'white'" },
        { name: 'app.stepsPerSecond', desc: 'How many times per second «onStep» runs.', default: '30' },
        { name: 'app.paused', desc: `Set to «${T}» to pause «onStep».`, default: F },
        { name: 'app.stop()', desc: 'Stops all events for good.' },
        { name: 'app.width, app.height', desc: 'The canvas size (400 × 400).' }
      ],
      example: py ? "app.background = 'midnightBlue'\nLabel('Night time', 200, 200, size=30, fill='white')" : "app.background = 'midnightBlue'\nLabel('Night time', 200, 200, {size: 30, fill: 'white'})",
      tips: [py ? 'You can store your own values on app too, like «app.score = 0» — handy inside event functions.' : 'You can store your own values on app too, like «app.score = 0» — handy inside event functions.']
    },
    {
      name: 'onMousePress',
      category: 'Events',
      signature: py ? 'def onMousePress(mouseX, mouseY):' : 'function onMousePress(mouseX, mouseY) {}',
      summary: 'Runs every time you click the canvas. «mouseX» and «mouseY» tell you where.',
      params: [
        { name: 'mouseX', desc: 'x position of the click.' },
        { name: 'mouseY', desc: 'y position of the click.' }
      ],
      example: py
        ? "Label('Click anywhere!', 200, 30, size=18)\n\ndef onMousePress(mouseX, mouseY):\n    Circle(mouseX, mouseY, 15, fill='dodgerBlue')"
        : "Label('Click anywhere!', 200, 30, {size: 18})\n\nfunction onMousePress(mouseX, mouseY) {\n  Circle(mouseX, mouseY, 15, {fill: 'dodgerBlue'})\n}",
      tips: ['Also: «onMouseRelease(mouseX, mouseY)» when the button comes back up.']
    },
    {
      name: 'onMouseMove',
      category: 'Events',
      signature: py ? 'def onMouseMove(mouseX, mouseY):' : 'function onMouseMove(mouseX, mouseY) {}',
      summary: 'Runs whenever the mouse moves over the canvas (without the button held).',
      params: [{ name: 'mouseX, mouseY', desc: 'Where the mouse is now.' }],
      example: py
        ? "dot = Circle(200, 200, 20, fill='orange')\n\ndef onMouseMove(mouseX, mouseY):\n    dot.centerX = mouseX\n    dot.centerY = mouseY"
        : "const dot = Circle(200, 200, 20, {fill: 'orange'})\n\nfunction onMouseMove(mouseX, mouseY) {\n  dot.centerX = mouseX\n  dot.centerY = mouseY\n}"
    },
    {
      name: 'onMouseDrag',
      category: 'Events',
      signature: py ? 'def onMouseDrag(mouseX, mouseY):' : 'function onMouseDrag(mouseX, mouseY) {}',
      summary: 'Runs while the mouse moves with the button held down — great for drawing programs.',
      params: [{ name: 'mouseX, mouseY', desc: 'Where the mouse is now.' }],
      example: py
        ? "Label('Drag to draw', 200, 20)\n\ndef onMouseDrag(mouseX, mouseY):\n    Circle(mouseX, mouseY, 6, fill='crimson')"
        : "Label('Drag to draw', 200, 20)\n\nfunction onMouseDrag(mouseX, mouseY) {\n  Circle(mouseX, mouseY, 6, {fill: 'crimson'})\n}"
    },
    {
      name: 'onKeyPress',
      category: 'Events',
      signature: py ? 'def onKeyPress(key):' : 'function onKeyPress(key) {}',
      summary: "Runs when a key is pressed. «key» is the key's name: «'a'», «'A'» (with shift), «'space'», «'enter'», «'up'», «'down'», «'left'», «'right'»…",
      params: [{ name: 'key', desc: 'Which key was pressed, as a string.' }],
      example: py
        ? "box = Rect(175, 175, 50, 50, fill='green')\nLabel('Click here, then use the arrow keys', 200, 20)\n\ndef onKeyPress(key):\n    if key == 'right':\n        box.centerX += 20\n    elif key == 'left':\n        box.centerX -= 20\n    elif key == 'up':\n        box.centerY -= 20\n    elif key == 'down':\n        box.centerY += 20"
        : "const box = Rect(175, 175, 50, 50, {fill: 'green'})\nLabel('Click here, then use the arrow keys', 200, 20)\n\nfunction onKeyPress(key) {\n  if (key === 'right') box.centerX += 20\n  else if (key === 'left') box.centerX -= 20\n  else if (key === 'up') box.centerY -= 20\n  else if (key === 'down') box.centerY += 20\n}",
      tips: ['Click the canvas first so it gets your keystrokes.', 'Also: «onKeyRelease(key)» when a key is let go, and «onKeyHold(keys)» which runs every step with a list of the keys being held.']
    },
    {
      name: 'onStep',
      category: 'Events',
      signature: py ? 'def onStep():' : 'function onStep() {}',
      summary: 'Runs over and over, «app.stepsPerSecond» times a second (30 by default). Change shapes a little each step to animate them.',
      example: py
        ? "ball = Circle(50, 200, 25, fill='tomato')\napp.stepsPerSecond = 30\n\ndef onStep():\n    ball.centerX += 4\n    if ball.left > 400:\n        ball.right = 0"
        : "const ball = Circle(50, 200, 25, {fill: 'tomato'})\napp.stepsPerSecond = 30\n\nfunction onStep() {\n  ball.centerX += 4\n  if (ball.left > 400) ball.right = 0\n}",
      tips: ['Store changing values like speed on «app» (for example «app.dx = 5»).']
    },
    {
      name: 'contains',
      category: 'Methods',
      signature: 'shape.contains(x, y)',
      summary: `Gives «${T}» if the point (x, y) is inside the shape. Use it to check whether a click hit a button.`,
      params: [{ name: 'x, y', desc: 'The point to test.' }],
      example: py
        ? "button = Rect(130, 170, 140, 60, fill='gray')\nLabel('Press me', 200, 200, fill='white', size=18)\n\ndef onMousePress(mouseX, mouseY):\n    if button.contains(mouseX, mouseY):\n        button.fill = 'green'\n    else:\n        button.fill = 'gray'"
        : "const button = Rect(130, 170, 140, 60, {fill: 'gray'})\nLabel('Press me', 200, 200, {fill: 'white', size: 18})\n\nfunction onMousePress(mouseX, mouseY) {\n  button.fill = button.contains(mouseX, mouseY) ? 'green' : 'gray'\n}"
    },
    {
      name: 'hitsShape',
      category: 'Methods',
      signature: 'shape.hitsShape(otherShape)',
      summary: `Gives «${T}» if two shapes overlap — the basis of collisions in games.`,
      params: [{ name: 'otherShape', desc: 'The shape to test against.' }],
      example: py
        ? "wall = Rect(300, 100, 20, 200, fill='brown')\nball = Circle(50, 200, 20, fill='blue')\n\ndef onStep():\n    if not ball.hitsShape(wall):\n        ball.centerX += 5\n    else:\n        ball.fill = 'red'"
        : "const wall = Rect(300, 100, 20, 200, {fill: 'brown'})\nconst ball = Circle(50, 200, 20, {fill: 'blue'})\n\nfunction onStep() {\n  if (!ball.hitsShape(wall)) ball.centerX += 5\n  else ball.fill = 'red'\n}"
    },
    {
      name: 'toFront / toBack',
      category: 'Methods',
      signature: 'shape.toFront()',
      summary: 'Shapes created later are drawn on top. «toFront()» moves a shape on top of everything; «toBack()» moves it behind everything.',
      example: py
        ? "a = Circle(170, 200, 90, fill='crimson')\nb = Circle(230, 200, 90, fill='royalBlue')\na.toFront()"
        : "const a = Circle(170, 200, 90, {fill: 'crimson'})\nconst b = Circle(230, 200, 90, {fill: 'royalBlue'})\na.toFront()"
    },
    {
      name: 'distance',
      category: 'Helpers',
      signature: 'distance(x1, y1, x2, y2)',
      summary: 'How far apart two points are.',
      params: [{ name: 'x1, y1, x2, y2', desc: 'The two points.' }],
      example: py
        ? "d = distance(0, 0, 300, 400)\nLabel(d, 200, 200, size=40)"
        : "const d = distance(0, 0, 300, 400)\nLabel(d, 200, 200, {size: 40})",
      tips: ['Also: «angleTo(x1, y1, x2, y2)» gives the direction in degrees, and «getPointInDir(x, y, angle, distance)» gives a point that far away in that direction.']
    }
  ]
}

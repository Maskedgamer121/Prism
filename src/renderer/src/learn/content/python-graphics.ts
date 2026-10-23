import type { Exercise, LearnTest, Track } from '@shared/learn'

const DRAW: LearnTest[] = [{ label: 'Your drawing matches the goal' }]

function gx(id: string, title: string, prompt: string, starter: string, solution: string, extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'graphics', prompt, starter, solution, tests: DRAW, points: 1, ...extra }
}
const click = (x: number, y: number) => ({ type: 'mousePress' as const, x, y })
const key = (k: string) => ({ type: 'keyPress' as const, key: k })

export const PYTHON_GRAPHICS: Track = {
  id: 'python-graphics',
  language: 'python',
  kind: 'graphics',
  title: 'Python Graphics',
  tagline: 'Learn Python by drawing pictures, animations and games — like CMU CS Academy.',
  level: 'Beginner',
  docs: 'python-graphics',
  units: [
    {
      id: 'pg-u1',
      title: 'Drawing with Shapes',
      lessons: [
        {
          id: 'pg-1-1',
          title: 'Getting Started',
          summary: 'Run your first program and learn how the canvas works.',
          parts: [
            {
              title: 'Drawing a Circle',
              sections: [
                {
                  type: 'text',
                  md: 'Welcome! In this course you learn to code by drawing pictures, making animations and building games. Python reads your code **from top to bottom** and draws each shape on the canvas.\n\nPress the green **Run** button (or **Ctrl+Enter**) to see a circle appear:'
                },
                { type: 'example', code: 'Circle(200, 200, 150)' },
                { type: 'text', md: 'We wrote «Circle(200, 200, 150)» and Python drew a circle. The numbers control *where* the circle is and *how big* it is. Change them and run again:' },
                { type: 'example', code: '# This draws a different circle!\nCircle(250, 300, 50)' },
                { type: 'callout', tone: 'tip', md: 'Lines that start with «#» are **comments**. Python ignores them — they are notes for people reading your code.' }
              ]
            },
            {
              title: 'The Canvas',
              sections: [
                {
                  type: 'text',
                  md: 'The canvas is a grid **400 pixels wide and 400 pixels tall**. Every point has an **x** (how far from the left) and a **y** (how far down from the top).\n\n- «(0, 0)» is the **top-left** corner\n- «(400, 0)» is the top-right\n- «(200, 200)» is the middle\n- «(0, 400)» is the bottom-left\n\nNotice that **y gets bigger as you go down** — the opposite of math class!'
                },
                {
                  type: 'example',
                  code: "Circle(0, 0, 20, fill='red')\nCircle(400, 0, 20, fill='blue')\nCircle(200, 200, 20, fill='green')\nCircle(0, 400, 20, fill='orange')\nCircle(400, 400, 20, fill='purple')\nLabel('(0, 0)', 45, 30)\nLabel('(200, 200)', 200, 235)\nLabel('(400, 400)', 350, 370)"
                },
                { type: 'callout', tone: 'tip', md: 'Move your mouse over any canvas — the **x** and **y** under it show exactly where you are pointing.' }
              ]
            },
            {
              title: 'How Circle works',
              sections: [
                { type: 'text', md: 'Before you draw more circles, here is everything «Circle» can do. The three **required** numbers come first; everything after them is **optional** and has a default value.' },
                { type: 'doc', api: 'Circle' },
                {
                  type: 'checkpoint',
                  exercise: gx(
                    'pg-1-1-cp1',
                    'Your first circle',
                    'Draw a circle with its center at «(100, 100)» and a radius of «50».',
                    '# Draw your circle here\n',
                    'Circle(100, 100, 50)'
                  )
                }
              ]
            },
            {
              title: 'Errors',
              sections: [
                { type: 'text', md: 'What happens if we forget a number? Run this and read the message in the console:' },
                { type: 'example', code: 'Circle(100, 200, )' },
                {
                  type: 'callout',
                  tone: 'warn',
                  md: '**Case matters**, so «Circle» is not the same as «circle».\n\n«Circle» needs a «centerX», «centerY» and «radius», and they must:\n- be in the right order,\n- be inside parentheses,\n- be separated by commas.\n\nIf a rule is broken, Python stops and tells you which **line** has the problem. Errors are normal — every programmer sees them all day!'
                }
              ]
            }
          ],
          exercises: [
            gx('pg-1-1-e1', 'Two eyes', 'Draw two circles with radius «40»: one centered at «(130, 200)» and one at «(270, 200)».', '# Left eye\n\n# Right eye\n', 'Circle(130, 200, 40)\nCircle(270, 200, 40)'),
            gx(
              'pg-1-1-e2',
              'Target',
              "Draw a target in the middle of the canvas «(200, 200)»: a red circle with radius «150», a white circle with radius «100» on top, and a red circle with radius «50» on top of that.\n\nUse «fill='red'» or «fill='white'» to color each circle.",
              "# Biggest circle first, so smaller ones go on top\nCircle(200, 200, 150, fill='red')\n",
              "Circle(200, 200, 150, fill='red')\nCircle(200, 200, 100, fill='white')\nCircle(200, 200, 50, fill='red')",
              { hints: ['Shapes drawn later appear **on top**. Draw the big circle first.'] }
            ),
            gx(
              'pg-1-1-e3',
              'Snowman',
              "Build a snowman out of three «'lightGray'» circles, all with «centerX» of «200»:\n- bottom: center y «310», radius «80»\n- middle: center y «190», radius «60»\n- head: center y «95», radius «45»",
              '# Bottom\n\n# Middle\n\n# Head\n',
              "Circle(200, 310, 80, fill='lightGray')\nCircle(200, 190, 60, fill='lightGray')\nCircle(200, 95, 45, fill='lightGray')",
              { points: 2 }
            )
          ]
        },
        {
          id: 'pg-1-2',
          title: 'Rectangles and Ovals',
          summary: 'Draw boxes and ovals, and learn that order matters.',
          parts: [
            {
              title: 'Rectangles',
              sections: [
                { type: 'text', md: 'A circle is placed by its **center**. A rectangle is different: its first two numbers are the **top-left corner**, then its **width** and **height**.' },
                { type: 'doc', api: 'Rect' },
                {
                  type: 'callout',
                  tone: 'info',
                  md: "«Rect(0, 0, 100, 100, fill='red')» means: start at the top-left corner «(0, 0)», go 100 pixels right and 100 pixels down, and fill it red."
                },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-1-2-cp1', 'A blue box', "Draw a «'steelBlue'» rectangle whose top-left corner is at «(100, 150)», «200» wide and «100» tall.", '', "Rect(100, 150, 200, 100, fill='steelBlue')")
                }
              ]
            },
            {
              title: 'Ovals',
              sections: [
                { type: 'text', md: 'An «Oval» is like a stretched circle. Like a circle, it is placed by its center — but it has a separate width and height.' },
                { type: 'doc', api: 'Oval' }
              ]
            },
            {
              title: 'Order matters',
              sections: [
                { type: 'text', md: 'Python draws shapes in the order your code creates them, so **later shapes cover earlier ones**. Swap the two lines below and run again to see the difference:' },
                { type: 'example', code: "Rect(100, 100, 200, 200, fill='gold')\nCircle(200, 200, 120, fill='teal')" }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-1-2-e1',
              'House',
              "Draw a house:\n- body: «'tan'» rectangle at «(100, 200)», «200» wide, «150» tall\n- door: «'saddleBrown'» rectangle at «(175, 270)», «50» wide, «80» tall\n- two «'lightBlue'» windows, each «40» × «40», at «(120, 230)» and «(240, 230)»",
              '# Body\n\n# Door\n\n# Windows\n',
              "Rect(100, 200, 200, 150, fill='tan')\nRect(175, 270, 50, 80, fill='saddleBrown')\nRect(120, 230, 40, 40, fill='lightBlue')\nRect(240, 230, 40, 40, fill='lightBlue')"
            ),
            gx(
              'pg-1-2-e2',
              'Traffic light',
              "Draw a traffic light: a black rectangle at «(150, 50)» that is «100» wide and «300» tall, with three circles of radius «35» centered at x «200»: red at y «110», yellow at y «200», green at y «290».",
              "Rect(150, 50, 100, 300, fill='black')\n# Lights\n",
              "Rect(150, 50, 100, 300, fill='black')\nCircle(200, 110, 35, fill='red')\nCircle(200, 200, 35, fill='yellow')\nCircle(200, 290, 35, fill='green')"
            ),
            gx(
              'pg-1-2-e3',
              'An eye',
              "Draw an eye in the middle of the canvas:\n- a «'white'» oval «300» wide and «150» tall with a «'black'» border\n- a «'steelBlue'» iris: circle of radius «60»\n- a black pupil: circle of radius «25»",
              '',
              "Oval(200, 200, 300, 150, fill='white', border='black')\nCircle(200, 200, 60, fill='steelBlue')\nCircle(200, 200, 25)",
              { points: 2, hints: ['«border=\'black\'» adds an outline. The pupil uses the default fill, which is black.'] }
            )
          ]
        },
        {
          id: 'pg-1-3',
          title: 'Colors and Style',
          summary: 'Fill, borders, transparency, your own colors and gradients.',
          parts: [
            {
              title: 'Style properties',
              sections: [
                { type: 'text', md: 'Every shape shares the same style options. You add them after the required numbers, using «name=value».' },
                { type: 'doc', api: 'Style properties' },
                { type: 'callout', tone: 'tip', md: "Use «fill=None» to make a shape see-through, which is handy for rings: «Circle(200, 200, 100, fill=None, border='red', borderWidth=10)»." }
              ]
            },
            {
              title: 'Named colors and rgb',
              sections: [
                { type: 'text', md: 'There are 140 color names like «\'crimson\'», «\'skyBlue\'» and «\'papayaWhip\'» — see them all under **Docs + Colors → Colors**. Or mix your own with «rgb»:' },
                { type: 'doc', api: 'rgb' }
              ]
            },
            {
              title: 'Gradients and the background',
              sections: [
                { type: 'doc', api: 'gradient' },
                { type: 'doc', api: 'app' },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-1-3-cp1', 'A ring', "Draw a ring: a circle at «(200, 200)» with radius «100», no fill («fill=None»), a «'crimson'» border, and a border width of «10».", '', "Circle(200, 200, 100, fill=None, border='crimson', borderWidth=10)")
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-1-3-e1',
              'Sunset',
              "Paint a sunset:\n- background: a gradient from «'orange'» to «'purple'» starting at the «'top'»\n- sun: a «'gold'» circle at «(200, 300)» with radius «80»\n- sea: a «'midnightBlue'» rectangle covering the bottom 100 pixels (top-left «(0, 300)», «400» × «100»)",
              '',
              "app.background = gradient('orange', 'purple', start='top')\nCircle(200, 300, 80, fill='gold')\nRect(0, 300, 400, 100, fill='midnightBlue')",
              { hints: ["The background is set with «app.background = gradient(...)», not with a shape."] }
            ),
            gx(
              'pg-1-3-e2',
              'See-through',
              "Draw two overlapping circles with radius «100»: a «'red'» one at «(150, 200)» and a «'blue'» one at «(250, 200)». Give both an «opacity» of «50» so you can see where they overlap.",
              '',
              "Circle(150, 200, 100, fill='red', opacity=50)\nCircle(250, 200, 100, fill='blue', opacity=50)"
            ),
            gx(
              'pg-1-3-e3',
              'Color mixer',
              'Split the canvas into two halves with «Rect»: the left half filled with «rgb(255, 120, 0)», the right half with «rgb(0, 120, 255)».',
              '# Left half\n\n# Right half\n',
              'Rect(0, 0, 200, 400, fill=rgb(255, 120, 0))\nRect(200, 0, 200, 400, fill=rgb(0, 120, 255))'
            )
          ]
        },
        {
          id: 'pg-1-4',
          title: 'Lines, Polygons and Stars',
          summary: 'Straight lines, any shape with corners, stars and slices.',
          parts: [
            {
              title: 'Lines',
              sections: [{ type: 'doc', api: 'Line' }, { type: 'checkpoint', exercise: gx('pg-1-4-cp1', 'Diagonal', "Draw a «'red'» line from «(50, 50)» to «(350, 350)» with a «lineWidth» of «5».", '', "Line(50, 50, 350, 350, fill='red', lineWidth=5)") }]
            },
            {
              title: 'Polygons',
              sections: [{ type: 'doc', api: 'Polygon' }, { type: 'doc', api: 'RegularPolygon' }]
            },
            {
              title: 'Stars, arcs and rotation',
              sections: [
                { type: 'doc', api: 'Star' },
                { type: 'doc', api: 'Arc' },
                { type: 'text', md: 'Any shape can be turned with «rotateAngle» (degrees, clockwise):' },
                { type: 'example', code: "Rect(100, 150, 200, 100, fill='lightGray')\nRect(100, 150, 200, 100, fill='orange', opacity=70, rotateAngle=30)" }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-1-4-e1',
              'Mountain',
              "Draw a snowy mountain on a «'skyBlue'» background:\n- the mountain: a «'gray'» triangle with corners «(0, 400)», «(200, 100)» and «(400, 400)»\n- the snow cap: a «'white'» triangle with corners «(150, 175)», «(200, 100)» and «(250, 175)»",
              "app.background = 'skyBlue'\n",
              "app.background = 'skyBlue'\nPolygon(0, 400, 200, 100, 400, 400, fill='gray')\nPolygon(150, 175, 200, 100, 250, 175, fill='white')"
            ),
            gx(
              'pg-1-4-e2',
              'Starry night',
              "On a «'midnightBlue'» background, draw three «'gold'» stars:\n- center «(100, 100)», radius «40», «5» points\n- center «(300, 150)», radius «30», «5» points\n- center «(200, 300)», radius «60», «7» points",
              "app.background = 'midnightBlue'\n",
              "app.background = 'midnightBlue'\nStar(100, 100, 40, 5, fill='gold')\nStar(300, 150, 30, 5, fill='gold')\nStar(200, 300, 60, 7, fill='gold')"
            ),
            gx(
              'pg-1-4-e3',
              'Stop sign shape',
              "Draw a stop sign shape: a «'red'» «RegularPolygon» with «8» points at «(200, 200)», radius «150», a «'white'» border with «borderWidth=8», turned by «rotateAngle=22.5» so a flat side is on top.",
              '',
              "RegularPolygon(200, 200, 150, 8, fill='red', border='white', borderWidth=8, rotateAngle=22.5)",
              { points: 2 }
            )
          ]
        },
        {
          id: 'pg-1-5',
          title: 'Labels',
          summary: 'Put text on the canvas.',
          parts: [
            {
              title: 'Drawing text',
              sections: [
                { type: 'doc', api: 'Label' },
                { type: 'callout', tone: 'tip', md: "Text inside quotes is called a **string**. Use either kind of quote: «'hi'» or «\"hi\"». If your text has an apostrophe, wrap it in double quotes: «\"Press 'a'\"»." },
                { type: 'checkpoint', exercise: gx('pg-1-5-cp1', 'Hello, world', "Show «'Hello, world!'» in the middle of the canvas «(200, 200)» with «size=30».", '', "Label('Hello, world!', 200, 200, size=30)") }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-1-5-e1',
              'Stop sign',
              "Finish the stop sign: add a «'white'», bold label «'STOP'» at «(200, 200)» with size «60».",
              "RegularPolygon(200, 200, 150, 8, fill='red', border='white', borderWidth=8, rotateAngle=22.5)\n",
              "RegularPolygon(200, 200, 150, 8, fill='red', border='white', borderWidth=8, rotateAngle=22.5)\nLabel('STOP', 200, 200, size=60, fill='white', bold=True)"
            ),
            gx(
              'pg-1-5-e2',
              'Name tag',
              "Make a name tag:\n- a «'white'» card «Rect(50, 120, 300, 160)» with a «'red'» border of width «6»\n- a «'red'» header strip «Rect(50, 120, 300, 50)»\n- «'HELLO'» in «'white'», bold, size «26», at «(200, 145)»\n- «'my name is'» size «16» at «(200, 200)»\n- the name «'Ada'», bold, size «40», at «(200, 245)»",
              '',
              "Rect(50, 120, 300, 160, fill='white', border='red', borderWidth=6)\nRect(50, 120, 300, 50, fill='red')\nLabel('HELLO', 200, 145, size=26, fill='white', bold=True)\nLabel('my name is', 200, 200, size=16)\nLabel('Ada', 200, 245, size=40, bold=True)",
              { points: 2 }
            )
          ]
        }
      ]
    },
    {
      id: 'pg-u2',
      title: 'Variables and Properties',
      lessons: [
        {
          id: 'pg-2-1',
          title: 'Variables and Properties',
          summary: 'Give shapes names, then read and change their properties.',
          parts: [
            {
              title: 'Variables',
              sections: [
                {
                  type: 'text',
                  md: "A **variable** is a name for a value. Write the name, an «=» sign, and the value:\n\n«sun = Circle(320, 80, 50, fill='gold')»\n\nNow «sun» refers to that circle, so you can change it later — even after it has been drawn."
                },
                { type: 'example', code: "sun = Circle(320, 80, 50, fill='gold')\nsun.fill = 'orange'\nsun.radius = 70\nprint('The sun is at', sun.centerX, sun.centerY)" },
                { type: 'callout', tone: 'info', md: '«print(...)» shows values in the console. It is great for checking what a property is right now.' }
              ]
            },
            {
              title: 'Properties',
              sections: [
                { type: 'text', md: 'Every shape has **properties** you can read and change with a dot: «shape.property». Changing «centerX», «left», «top» or similar **moves** the shape.' },
                { type: 'example', code: "box = Rect(0, 0, 80, 80, fill='tomato')\nbox.centerX = 200\nbox.centerY = 200\nbox.rotateAngle = 45\nprint(box.left, box.right, box.width)" },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-2-1-cp1', 'Move the ball', "A ball starts at «(100, 100)». Use its properties to move it so its center is at x «300», and make it «'green'».", "ball = Circle(100, 100, 30, fill='red')\n# Change ball's properties below\n", "ball = Circle(100, 100, 30, fill='red')\nball.centerX = 300\nball.fill = 'green'", {
                    requires: [{ pattern: 'ball\\.centerX\\s*=', message: 'Move the ball by setting «ball.centerX», not by changing the Circle(...) line.' }]
                  })
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-2-1-e1',
              'Moonrise',
              "The moon starts in the top-left corner. Using «moon.centerX» and «moon.centerY», move it to «(320, 100)». Don't change the first line!",
              "moon = Circle(80, 80, 40, fill='lightYellow')\napp.background = 'midnightBlue'\n",
              "moon = Circle(80, 80, 40, fill='lightYellow')\napp.background = 'midnightBlue'\nmoon.centerX = 320\nmoon.centerY = 100",
              { requires: [{ pattern: 'moon\\.centerX\\s*=', message: 'Use «moon.centerX = ...» to move the moon.' }] }
            ),
            gx(
              'pg-2-1-e2',
              'Stack the blocks',
              "Put the small «top» block exactly on the middle of the «base»: set «top.centerX» to «base.centerX», and set «top.bottom» to «base.top».",
              "base = Rect(100, 300, 200, 50, fill='brown')\ntop = Rect(0, 0, 100, 50, fill='peru')\n# Line up the top block here\n",
              "base = Rect(100, 300, 200, 50, fill='brown')\ntop = Rect(0, 0, 100, 50, fill='peru')\ntop.centerX = base.centerX\ntop.bottom = base.top",
              { points: 2, requires: [{ pattern: 'top\\.bottom\\s*=', message: 'Use «top.bottom = base.top» to sit the block on the base.' }] }
            )
          ]
        },
        {
          id: 'pg-2-2',
          title: 'Math with Properties',
          summary: 'Use arithmetic to size and place shapes relative to each other.',
          parts: [
            {
              title: 'Arithmetic',
              sections: [
                { type: 'text', md: 'Python can do math: «+», «-», «*» (times), «/» (divide). You can use math anywhere a number goes, including with properties.' },
                { type: 'example', code: "a = Circle(100, 200, 30, fill='orange')\nb = Circle(a.centerX + 150, 200, a.radius * 2, fill='teal')\nprint('b is', b.radius, 'pixels in radius')" },
                { type: 'text', md: '«x += 10» is a shortcut for «x = x + 10». It works with properties too: «a.centerX += 50».' },
                { type: 'example', code: "c = Circle(50, 200, 30)\nc.centerX += 100\nc.centerX += 100\nc.radius *= 2" }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-2-2-e1',
              'Triple size',
              "A small orange circle is given. Create a «'teal'» circle at «(275, 200)» whose radius is **three times** the small circle's radius. Use «small.radius» in your code.",
              "small = Circle(100, 200, 25, fill='orange')\n",
              "small = Circle(100, 200, 25, fill='orange')\nbig = Circle(275, 200, small.radius * 3, fill='teal')",
              { requires: [{ pattern: 'small\\.radius', message: 'Use «small.radius» to compute the new radius.' }] }
            ),
            gx(
              'pg-2-2-e2',
              'Walking right',
              "Start with the given square. Use «+=» on «step.left» three times, moving it «100» pixels each time, and then make it «'gold'».",
              "step = Rect(0, 175, 50, 50, fill='gray')\n",
              "step = Rect(0, 175, 50, 50, fill='gray')\nstep.left += 100\nstep.left += 100\nstep.left += 100\nstep.fill = 'gold'",
              { requires: [{ pattern: '\\+=', message: 'Use «+=» to move the square.' }] }
            )
          ]
        }
      ]
    },
    {
      id: 'pg-u3',
      title: 'Mouse Events',
      lessons: [
        {
          id: 'pg-3-1',
          title: 'Clicking',
          summary: 'Make things happen when you click.',
          parts: [
            {
              title: 'Functions and onMousePress',
              sections: [
                {
                  type: 'text',
                  md: "So far, code ran once from top to bottom. To react to the user, we write a **function** with a special name. Prism calls «onMousePress» every time you click the canvas, and tells you where with «mouseX» and «mouseY».\n\nThe lines *inside* the function must be **indented** (4 spaces). Click the canvas after running:"
                },
                { type: 'doc', api: 'onMousePress' },
                { type: 'callout', tone: 'warn', md: 'The function name must be spelled exactly «onMousePress» — capital M and P — or Prism won’t find it.' },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-3-1-cp1', 'Teleport', 'When the user clicks, move the dot so its center is where they clicked.', "dot = Circle(200, 200, 20, fill='red')\n\ndef onMousePress(mouseX, mouseY):\n    # move the dot here\n    pass\n", "dot = Circle(200, 200, 20, fill='red')\n\ndef onMousePress(mouseX, mouseY):\n    dot.centerX = mouseX\n    dot.centerY = mouseY\n", {
                    tests: [{ label: 'Starts in the middle' }, { label: 'Click at (100, 300) moves the dot there', events: [click(100, 300)] }]
                  })
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-3-1-e1',
              'Paint dots',
              "Every click should draw a new «'purple'» circle with radius «10» where the user clicked.",
              "Label('Click to paint', 200, 20, size=16)\n\ndef onMousePress(mouseX, mouseY):\n    pass\n",
              "Label('Click to paint', 200, 20, size=16)\n\ndef onMousePress(mouseX, mouseY):\n    Circle(mouseX, mouseY, 10, fill='purple')\n",
              { tests: [{ label: 'Starts with just the label' }, { label: 'Three clicks make three dots', events: [click(100, 100), click(300, 200), click(150, 350)] }] }
            ),
            gx(
              'pg-3-1-e2',
              'Lights on',
              "The room is dark. When the user clicks anywhere, make the bulb «'yellow'» and the background «'white'».",
              "app.background = 'black'\nbulb = Circle(200, 150, 60, fill='gray')\nRect(180, 210, 40, 40, fill='dimGray')\n\ndef onMousePress(mouseX, mouseY):\n    pass\n",
              "app.background = 'black'\nbulb = Circle(200, 150, 60, fill='gray')\nRect(180, 210, 40, 40, fill='dimGray')\n\ndef onMousePress(mouseX, mouseY):\n    bulb.fill = 'yellow'\n    app.background = 'white'\n",
              { tests: [{ label: 'Starts dark' }, { label: 'A click turns the light on', events: [click(50, 50)] }] }
            )
          ]
        },
        {
          id: 'pg-3-2',
          title: 'Moving and Dragging',
          summary: 'Follow the mouse and draw by dragging.',
          parts: [
            { title: 'onMouseMove', sections: [{ type: 'doc', api: 'onMouseMove' }] },
            { title: 'onMouseDrag', sections: [{ type: 'doc', api: 'onMouseDrag' }] }
          ],
          exercises: [
            gx(
              'pg-3-2-e1',
              'Follow me',
              'Make the orange dot follow the mouse whenever it moves.',
              "cursorDot = Circle(200, 200, 15, fill='orange')\n",
              "cursorDot = Circle(200, 200, 15, fill='orange')\n\ndef onMouseMove(mouseX, mouseY):\n    cursorDot.centerX = mouseX\n    cursorDot.centerY = mouseY\n",
              {
                tests: [
                  { label: 'Starts in the middle' },
                  { label: 'Follows the mouse to (50, 60)', events: [{ type: 'mouseMove', x: 50, y: 60 }] },
                  { label: 'Follows the mouse to (300, 320)', events: [{ type: 'mouseMove', x: 50, y: 60 }, { type: 'mouseMove', x: 300, y: 320 }] }
                ]
              }
            ),
            gx(
              'pg-3-2-e2',
              'Sketch pad',
              "While the mouse is dragged, draw a «'black'» circle with radius «5» at the mouse.",
              "Label('Drag to draw', 200, 20)\n",
              "Label('Drag to draw', 200, 20)\n\ndef onMouseDrag(mouseX, mouseY):\n    Circle(mouseX, mouseY, 5, fill='black')\n",
              {
                points: 2,
                tests: [
                  { label: 'Starts empty' },
                  { label: 'Dragging draws a trail', events: [{ type: 'mouseDrag', x: 100, y: 100 }, { type: 'mouseDrag', x: 110, y: 105 }, { type: 'mouseDrag', x: 120, y: 110 }, { type: 'mouseDrag', x: 130, y: 115 }] }
                ]
              }
            )
          ]
        }
      ]
    },
    {
      id: 'pg-u4',
      title: 'Conditionals',
      lessons: [
        {
          id: 'pg-4-1',
          title: 'If and Else',
          summary: 'Make decisions in your code.',
          parts: [
            {
              title: 'if statements',
              sections: [
                {
                  type: 'text',
                  md: 'An «if» statement runs its indented block **only when** its condition is true. «else» runs when it isn’t.\n\nCompare numbers with «<», «>», «<=», «>=», «==» (equal) and «!=» (not equal). Remember: «=» *stores* a value, «==» *compares* two values.'
                },
                {
                  type: 'example',
                  code: "Line(200, 0, 200, 400, dashes=True)\nmsg = Label('Click left or right', 200, 30, size=18)\n\ndef onMousePress(mouseX, mouseY):\n    if mouseX < 200:\n        msg.value = 'Left side!'\n        app.background = 'lightBlue'\n    else:\n        msg.value = 'Right side!'\n        app.background = 'pink'"
                },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-4-1-cp1', 'Left or right', "When the user clicks the left half (x less than 200), set the background to «'lightBlue'». Otherwise set it to «'pink'».", 'def onMousePress(mouseX, mouseY):\n    pass\n', "def onMousePress(mouseX, mouseY):\n    if mouseX < 200:\n        app.background = 'lightBlue'\n    else:\n        app.background = 'pink'\n", {
                    tests: [{ label: 'Click on the left', events: [click(100, 200)] }, { label: 'Click on the right', events: [click(300, 200)] }]
                  })
                }
              ]
            },
            { title: 'Did the click hit a shape?', sections: [{ type: 'doc', api: 'contains' }] }
          ],
          exercises: [
            gx(
              'pg-4-1-e1',
              'Button',
              "Turn the button «'green'» only when the click is **inside** it (use «button.contains(mouseX, mouseY)»). Clicks outside should do nothing.",
              "button = Rect(150, 175, 100, 50, fill='gray')\nLabel('Press me', 200, 200, fill='white')\n\ndef onMousePress(mouseX, mouseY):\n    pass\n",
              "button = Rect(150, 175, 100, 50, fill='gray')\nLabel('Press me', 200, 200, fill='white')\n\ndef onMousePress(mouseX, mouseY):\n    if button.contains(mouseX, mouseY):\n        button.fill = 'green'\n",
              { tests: [{ label: 'A click outside does nothing', events: [click(50, 50)] }, { label: 'A click inside turns it green', events: [click(200, 200)] }] }
            ),
            gx(
              'pg-4-1-e2',
              'Light switch',
              "Each click should **toggle** the bulb: if it is «'gray'» make it «'yellow'», otherwise make it «'gray'».",
              "bulb = Circle(200, 200, 80, fill='gray')\n\ndef onMousePress(mouseX, mouseY):\n    pass\n",
              "bulb = Circle(200, 200, 80, fill='gray')\n\ndef onMousePress(mouseX, mouseY):\n    if bulb.fill == 'gray':\n        bulb.fill = 'yellow'\n    else:\n        bulb.fill = 'gray'\n",
              { points: 2, tests: [{ label: 'One click turns it on', events: [click(200, 200)] }, { label: 'A second click turns it off', events: [click(200, 200), click(200, 200)] }, { label: 'A third click turns it on again', events: [click(1, 1), click(1, 1), click(1, 1)] }] }
            )
          ]
        },
        {
          id: 'pg-4-2',
          title: 'Elif, And, Or',
          summary: 'Choose between many options and combine conditions.',
          parts: [
            {
              title: 'elif',
              sections: [
                { type: 'text', md: '«elif» (short for *else if*) lets you check several conditions in order. Python runs the **first** block whose condition is true and skips the rest.' },
                { type: 'example', code: "label = Label('Click somewhere', 200, 200, size=24)\n\ndef onMousePress(mouseX, mouseY):\n    if mouseY < 133:\n        label.value = 'Top'\n    elif mouseY < 266:\n        label.value = 'Middle'\n    else:\n        label.value = 'Bottom'" }
              ]
            },
            {
              title: 'and, or, not',
              sections: [
                { type: 'text', md: 'Combine conditions: «a and b» is true only if both are; «a or b» if at least one is; «not a» flips true and false.' },
                { type: 'example', code: "Rect(100, 100, 200, 200, fill=None, border='black')\nmsg = Label('', 200, 50, size=20)\n\ndef onMousePress(mouseX, mouseY):\n    if 100 < mouseX < 300 and 100 < mouseY < 300:\n        msg.value = 'Inside the box'\n    else:\n        msg.value = 'Outside'" },
                { type: 'doc', api: 'distance' }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-4-2-e1',
              'Three zones',
              "Clicking in the top third (y below «133») sets the background to «'red'», the middle third (y below «266») to «'yellow'», and the bottom third to «'green'».",
              'def onMousePress(mouseX, mouseY):\n    pass\n',
              "def onMousePress(mouseX, mouseY):\n    if mouseY < 133:\n        app.background = 'red'\n    elif mouseY < 266:\n        app.background = 'yellow'\n    else:\n        app.background = 'green'\n",
              { tests: [{ label: 'Top click', events: [click(200, 50)] }, { label: 'Middle click', events: [click(200, 200)] }, { label: 'Bottom click', events: [click(200, 350)] }] }
            ),
            gx(
              'pg-4-2-e2',
              'Bullseye',
              "When the user clicks, set the label to «'Bullseye!'» if the click is within «50» pixels of the center «(200, 200)» (use «distance»), otherwise «'Miss'».",
              "Circle(200, 200, 150, fill='red')\nCircle(200, 200, 100, fill='white')\nCircle(200, 200, 50, fill='red')\nresult = Label('Click the target', 200, 370, size=24)\n\ndef onMousePress(mouseX, mouseY):\n    pass\n",
              "Circle(200, 200, 150, fill='red')\nCircle(200, 200, 100, fill='white')\nCircle(200, 200, 50, fill='red')\nresult = Label('Click the target', 200, 370, size=24)\n\ndef onMousePress(mouseX, mouseY):\n    if distance(mouseX, mouseY, 200, 200) <= 50:\n        result.value = 'Bullseye!'\n    else:\n        result.value = 'Miss'\n",
              { points: 2, tests: [{ label: 'Hit the middle', events: [click(210, 190)] }, { label: 'Miss', events: [click(40, 40)] }] }
            )
          ]
        }
      ]
    },
    {
      id: 'pg-u5',
      title: 'Keys and Animation',
      lessons: [
        {
          id: 'pg-5-1',
          title: 'Key Presses',
          summary: 'Control things with the keyboard.',
          parts: [
            {
              title: 'onKeyPress',
              sections: [
                { type: 'doc', api: 'onKeyPress' },
                {
                  type: 'checkpoint',
                  exercise: gx(
                    'pg-5-1-cp1',
                    'Arrow keys',
                    "Move the player «20» pixels in the direction of the arrow key pressed: «'left'», «'right'», «'up'», «'down'».",
                    "player = Circle(200, 200, 20, fill='blue')\n\ndef onKeyPress(key):\n    pass\n",
                    "player = Circle(200, 200, 20, fill='blue')\n\ndef onKeyPress(key):\n    if key == 'left':\n        player.centerX -= 20\n    elif key == 'right':\n        player.centerX += 20\n    elif key == 'up':\n        player.centerY -= 20\n    elif key == 'down':\n        player.centerY += 20\n",
                    { tests: [{ label: 'Right twice', events: [key('right'), key('right')] }, { label: 'Up then left', events: [key('up'), key('left')] }, { label: 'Down', events: [key('down')] }] }
                  )
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-5-1-e1',
              'Tug of war',
              "Press «'a'» to pull the flag 10 pixels left (red's side) and «'l'» to pull it 10 pixels right (blue's side).\n\nAfter moving it, if the flag's «centerX» is less than «100», change the header to «'Red wins!'»; if it is more than «300», change it to «'Blue wins!'».",
              "Rect(0, 0, 100, 400, fill='mistyRose')\nRect(300, 0, 100, 400, fill='lavender')\nheader = Label('Tug of War!', 200, 50, size=30)\nLabel(\"Press 'a' to pull\", 60, 110)\nLabel(\"Press 'l' to pull\", 340, 110)\nLine(25, 270, 375, 270)\nflag = RegularPolygon(200, 275, 10, 3, fill='red', rotateAngle=180)\n\ndef onKeyPress(key):\n    # Move the flag\n\n    # Check if either side wins and change the header\n    pass\n",
              "Rect(0, 0, 100, 400, fill='mistyRose')\nRect(300, 0, 100, 400, fill='lavender')\nheader = Label('Tug of War!', 200, 50, size=30)\nLabel(\"Press 'a' to pull\", 60, 110)\nLabel(\"Press 'l' to pull\", 340, 110)\nLine(25, 270, 375, 270)\nflag = RegularPolygon(200, 275, 10, 3, fill='red', rotateAngle=180)\n\ndef onKeyPress(key):\n    if key == 'a':\n        flag.centerX -= 10\n    elif key == 'l':\n        flag.centerX += 10\n    if flag.centerX < 100:\n        header.value = 'Red wins!'\n    elif flag.centerX > 300:\n        header.value = 'Blue wins!'\n",
              {
                points: 3,
                tests: [
                  { label: "Pull left once: onKeyPress('a')", events: [key('a')] },
                  { label: "Pull right twice: onKeyPress('l')", events: [key('l'), key('l')] },
                  { label: 'Red wins after 11 pulls', events: Array.from({ length: 11 }, () => key('a')) },
                  { label: 'Blue wins after 11 pulls', events: Array.from({ length: 11 }, () => key('l')) }
                ]
              }
            ),
            gx(
              'pg-5-1-e2',
              'Color keys',
              "Press «'r'» for a «'red'» background, «'g'» for «'green'» and «'b'» for «'blue'». Other keys do nothing.",
              "Label('Press r, g or b', 200, 200, size=24, fill='white')\napp.background = 'black'\n",
              "Label('Press r, g or b', 200, 200, size=24, fill='white')\napp.background = 'black'\n\ndef onKeyPress(key):\n    if key == 'r':\n        app.background = 'red'\n    elif key == 'g':\n        app.background = 'green'\n    elif key == 'b':\n        app.background = 'blue'\n",
              { tests: [{ label: "Press 'g'", events: [key('g')] }, { label: "Press 'r' then 'x'", events: [key('r'), key('x')] }, { label: "Press 'b'", events: [key('b')] }] }
            )
          ]
        },
        {
          id: 'pg-5-2',
          title: 'Animation with onStep',
          summary: 'Make things move by themselves.',
          parts: [
            {
              title: 'onStep',
              sections: [
                { type: 'doc', api: 'onStep' },
                { type: 'text', md: 'To bounce, keep the speed in a variable stored on «app», and flip its sign when the shape reaches an edge:' },
                { type: 'example', code: "ball = Circle(200, 200, 20, fill='tomato')\napp.dx = 6\n\ndef onStep():\n    ball.centerX += app.dx\n    if ball.right >= 400 or ball.left <= 0:\n        app.dx = -app.dx" },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-5-2-cp1', 'Slide right', 'Every step, move the car «5» pixels to the right.', "car = Rect(0, 180, 60, 40, fill='crimson')\n\ndef onStep():\n    pass\n", "car = Rect(0, 180, 60, 40, fill='crimson')\n\ndef onStep():\n    car.left += 5\n", {
                    tests: [{ label: 'After 10 steps', events: [{ type: 'step', count: 10 }] }, { label: 'After 40 steps', events: [{ type: 'step', count: 40 }] }]
                  })
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-5-2-e1',
              'Bouncing ball',
              "Move the ball by «app.dx» every step. When its «right» edge reaches «400» or its «left» edge reaches «0», reverse the direction (make «app.dx» negative of itself).",
              "ball = Circle(200, 200, 20, fill='tomato')\napp.dx = 8\n\ndef onStep():\n    pass\n",
              "ball = Circle(200, 200, 20, fill='tomato')\napp.dx = 8\n\ndef onStep():\n    ball.centerX += app.dx\n    if ball.right >= 400 or ball.left <= 0:\n        app.dx = -app.dx\n",
              { points: 2, tests: [{ label: 'After 10 steps', events: [{ type: 'step', count: 10 }] }, { label: 'Bounces off the right wall', events: [{ type: 'step', count: 40 }] }] }
            ),
            gx(
              'pg-5-2-e2',
              'Spinner',
              'Rotate the star «5» degrees every step.',
              "star = Star(200, 200, 120, 6, fill='gold')\n",
              "star = Star(200, 200, 120, 6, fill='gold')\n\ndef onStep():\n    star.rotateAngle += 5\n",
              { tests: [{ label: 'After 6 steps', events: [{ type: 'step', count: 6 }] }] }
            )
          ]
        }
      ]
    },
    {
      id: 'pg-u6',
      title: 'Loops',
      lessons: [
        {
          id: 'pg-6-1',
          title: 'For Loops',
          summary: 'Repeat code to draw patterns.',
          parts: [
            {
              title: 'for and range',
              sections: [
                {
                  type: 'text',
                  md: 'A «for» loop runs the indented code once for each number. «range(5)» gives «0, 1, 2, 3, 4». Use the loop variable to change where each shape goes:'
                },
                { type: 'example', code: "for i in range(5):\n    Circle(40 + i * 80, 200, 30, fill='teal')" },
                { type: 'text', md: '«range(start, stop, step)» counts from «start» up to (not including) «stop»:' },
                { type: 'example', code: "for x in range(20, 400, 40):\n    Line(x, 0, x, 400, fill='lightGray')\nfor size in range(150, 0, -30):\n    Circle(200, 200, size, fill=None, border='navy')" },
                {
                  type: 'checkpoint',
                  exercise: gx('pg-6-1-cp1', 'Row of circles', "Use a loop to draw 5 «'teal'» circles with radius «30» at y «200» and x «40, 120, 200, 280, 360».", '', "for i in range(5):\n    Circle(40 + i * 80, 200, 30, fill='teal')", {
                    requires: [{ pattern: '^\\s*for\\s', message: 'Use a «for» loop instead of writing five Circle lines.' }]
                  })
                }
              ]
            }
          ],
          exercises: [
            gx(
              'pg-6-1-e1',
              'Stripes',
              "Use a loop to draw 10 «'navy'» stripes, each «20» wide and «400» tall, with their left edges at «0, 40, 80, … 360».",
              '',
              "for i in range(10):\n    Rect(i * 40, 0, 20, 400, fill='navy')",
              { requires: [{ pattern: '^\\s*for\\s', message: 'Use a «for» loop.' }] }
            ),
            gx(
              'pg-6-1-e2',
              'Target rings',
              "Draw 5 circles centered at «(200, 200)» with radii «150, 120, 90, 60, 30». Even-numbered rings («i» = 0, 2, 4) are «'red'», odd ones «'white'». Hint: «i % 2 == 0» is true for even numbers.",
              'for i in range(5):\n    pass\n',
              "for i in range(5):\n    if i % 2 == 0:\n        Circle(200, 200, 150 - i * 30, fill='red')\n    else:\n        Circle(200, 200, 150 - i * 30, fill='white')",
              { points: 2, requires: [{ pattern: '^\\s*for\\s', message: 'Use a «for» loop.' }] }
            ),
            gx(
              'pg-6-1-e3',
              'Grid of dots',
              "Use two loops, one inside the other, to draw a 5 × 5 grid of «'orange'» dots with radius «15». Both x and y go «40, 120, 200, 280, 360».",
              "for row in range(5):\n    for col in range(5):\n        pass\n",
              "for row in range(5):\n    for col in range(5):\n        Circle(40 + col * 80, 40 + row * 80, 15, fill='orange')",
              { points: 3, requires: [{ pattern: 'for[\\s\\S]*\\n\\s+for\\s', message: 'Use a loop inside another loop.' }] }
            )
          ]
        }
      ]
    }
  ]
}

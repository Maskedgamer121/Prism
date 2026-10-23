import type { Exercise, LearnTest, Track } from '@shared/learn'

function cx(id: string, title: string, prompt: string, starter: string, solution: string, tests: LearnTest[] = [{ label: 'Output matches' }], extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'console', prompt, starter, solution, tests, points: 1, ...extra }
}
function gx(id: string, title: string, prompt: string, starter: string, solution: string, extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'graphics', prompt, starter, solution, tests: [{ label: 'Your drawing matches the goal' }], points: 1, ...extra }
}
const input = (label: string, stdin: string): LearnTest => ({ label, stdin })

export const JS_BASICS: Track = {
  id: 'javascript-basics',
  language: 'javascript',
  kind: 'console',
  title: 'JavaScript Basics',
  tagline: 'The language of the web: values, decisions, loops, functions, arrays and objects.',
  level: 'Beginner',
  docs: 'js-basics',
  units: [
    {
      id: 'jb-u1',
      title: 'First Steps',
      lessons: [
        {
          id: 'jb-1-1',
          title: 'Printing and Variables',
          summary: 'console.log, let and const.',
          parts: [
            {
              title: 'Printing',
              sections: [
                { type: 'text', md: 'JavaScript runs in every web browser — and here it runs right inside Prism. «console.log» prints to the console:' },
                { type: 'doc', api: 'console.log' },
                { type: 'checkpoint', exercise: cx('jb-1-1-cp1', 'Hello', 'Print exactly «Hello from JavaScript!»', '', "console.log('Hello from JavaScript!')") }
              ]
            },
            { title: 'Variables', sections: [{ type: 'doc', api: 'let / const' }, { type: 'doc', api: 'Math' }] }
          ],
          exercises: [
            cx('jb-1-1-e1', 'Seconds in a day', 'Make «const hours = 24», «const minutes = 60», «const seconds = 60» and print how many seconds are in a day using them.', 'const hours = 24\n', 'const hours = 24\nconst minutes = 60\nconst seconds = 60\nconsole.log(hours * minutes * seconds)'),
            cx('jb-1-1-e2', 'Score keeper', 'Start with «let score = 10». Add «5», then multiply by «3» using «+=» and «*=», and print the score («45»).', 'let score = 10\n', 'let score = 10\nscore += 5\nscore *= 3\nconsole.log(score)', undefined, { requires: [{ pattern: '\\+=', message: 'Use «+=».' }, { pattern: '\\*=', message: 'Use «*=».' }] })
          ]
        },
        {
          id: 'jb-1-2',
          title: 'Strings and Input',
          summary: 'Template literals and prompt().',
          parts: [{ title: 'Text', sections: [{ type: 'doc', api: 'Strings & template literals' }, { type: 'doc', api: 'prompt' }] }],
          exercises: [
            cx('jb-1-2-e1', 'Greeter', 'Read a name with «prompt()» and print «Hello, NAME!» using a template literal.', 'const name = prompt()\n', "const name = prompt()\nconsole.log(`Hello, ${name}!`)", [input('Ada', 'Ada'), input('Grace', 'Grace')]),
            cx('jb-1-2-e2', 'Adder', 'Read two numbers (one per line) and print «a + b = sum», e.g. «3 + 4 = 7».', 'const a = Number(prompt())\n', "const a = Number(prompt())\nconst b = Number(prompt())\nconsole.log(`${a} + ${b} = ${a + b}`)", [input('3 and 4', '3\n4'), input('10 and 5', '10\n5')], { points: 2, hints: ['«prompt()» gives a string. «Number(...)» turns it into a number.'] })
          ]
        }
      ]
    },
    {
      id: 'jb-u2',
      title: 'Logic and Loops',
      lessons: [
        {
          id: 'jb-2-1',
          title: 'Decisions',
          summary: 'if, else if, else.',
          parts: [{ title: 'if / else', sections: [{ type: 'doc', api: 'if / else' }] }],
          exercises: [
            cx('jb-2-1-e1', 'Even or odd', 'Read a number and print «even» or «odd».', 'const n = Number(prompt())\n', "const n = Number(prompt())\nif (n % 2 === 0) {\n  console.log('even')\n} else {\n  console.log('odd')\n}", [input('4', '4'), input('9', '9')]),
            cx('jb-2-1-e2', 'Temperature', 'Read a temperature. Print «hot» if above 30, «warm» if above 15, otherwise «cold».', 'const t = Number(prompt())\n', "const t = Number(prompt())\nif (t > 30) console.log('hot')\nelse if (t > 15) console.log('warm')\nelse console.log('cold')", [input('35', '35'), input('20', '20'), input('3', '3')])
          ]
        },
        {
          id: 'jb-2-2',
          title: 'Loops',
          summary: 'for, for…of and while.',
          parts: [{ title: 'Loops', sections: [{ type: 'doc', api: 'for / while' }] }],
          exercises: [
            cx('jb-2-2-e1', 'FizzBuzz', 'Print the numbers 1 to 15, but print «Fizz» for multiples of 3, «Buzz» for multiples of 5, and «FizzBuzz» for multiples of both.', 'for (let i = 1; i <= 15; i++) {\n\n}\n', "for (let i = 1; i <= 15; i++) {\n  if (i % 15 === 0) console.log('FizzBuzz')\n  else if (i % 3 === 0) console.log('Fizz')\n  else if (i % 5 === 0) console.log('Buzz')\n  else console.log(i)\n}", undefined, { points: 2, hints: ['Check for 15 first — otherwise the 3 check catches it.'] }),
            cx('jb-2-2-e2', 'Stars', 'Read «n» and print a triangle of stars with «n» rows: «*», «**», «***»…', 'const n = Number(prompt())\n', "const n = Number(prompt())\nfor (let i = 1; i <= n; i++) console.log('*'.repeat(i))", [input('3', '3'), input('5', '5')], { hints: ["«'*'.repeat(3)» makes «***»."] })
          ]
        }
      ]
    },
    {
      id: 'jb-u3',
      title: 'Functions and Data',
      lessons: [
        {
          id: 'jb-3-1',
          title: 'Functions',
          summary: 'Reusable code.',
          parts: [{ title: 'Functions', sections: [{ type: 'doc', api: 'Functions' }] }],
          exercises: [
            cx('jb-3-1-e1', 'Circle area', 'Write «area(r)» that returns «Math.PI * r * r» rounded to 2 decimals with «Number(x.toFixed(2))». Print «area(1)» and «area(3)».', 'function area(r) {\n\n}\n\nconsole.log(area(1))\nconsole.log(area(3))\n', 'function area(r) {\n  return Number((Math.PI * r * r).toFixed(2))\n}\n\nconsole.log(area(1))\nconsole.log(area(3))\n', undefined, { requires: [{ pattern: 'return', message: 'Use «return».' }] })
          ]
        },
        {
          id: 'jb-3-2',
          title: 'Arrays and Objects',
          summary: 'Lists of values and named values.',
          parts: [{ title: 'Collections', sections: [{ type: 'doc', api: 'Arrays' }, { type: 'doc', api: 'Objects' }] }],
          exercises: [
            cx('jb-3-2-e1', 'Total price', 'Read a line of prices separated by spaces (like «2.5 4 1.25») and print the total.', "const prices = prompt().split(' ').map(Number)\n", "const prices = prompt().split(' ').map(Number)\nlet total = 0\nfor (const p of prices) total += p\nconsole.log(total)", [input('2.5 4 1.25', '2.5 4 1.25'), input('10 20', '10 20')]),
            cx('jb-3-2-e2', 'Pet card', 'Make an object «pet» with «name: \'Rex\'», «species: \'dog\'» and «age: 3». Then print «Rex is a 3 year old dog» using its properties.', 'const pet = {\n\n}\n', "const pet = { name: 'Rex', species: 'dog', age: 3 }\nconsole.log(`${pet.name} is a ${pet.age} year old ${pet.species}`)", undefined, { requires: [{ pattern: 'pet\\.name', message: 'Use «pet.name» in the sentence.' }] })
          ]
        }
      ]
    }
  ]
}

export const JS_GRAPHICS: Track = {
  id: 'javascript-graphics',
  language: 'javascript',
  kind: 'graphics',
  title: 'JavaScript Graphics',
  tagline: 'Draw, animate and make games with JavaScript and the same shapes as the Python course.',
  level: 'Beginner',
  docs: 'js-graphics',
  units: [
    {
      id: 'jg-u1',
      title: 'Shapes in JavaScript',
      lessons: [
        {
          id: 'jg-1-1',
          title: 'Drawing Shapes',
          summary: 'Circles, rectangles and style options.',
          parts: [
            {
              title: 'Shapes',
              sections: [
                { type: 'text', md: "In JavaScript, style options go in an **object** at the end: «Rect(0, 0, 100, 100, {fill: 'red'})». Everything else works like the Python course." },
                { type: 'doc', api: 'Circle' },
                { type: 'doc', api: 'Rect' },
                { type: 'checkpoint', exercise: gx('jg-1-1-cp1', 'Red square', "Draw a red 100 × 100 square in the top-left corner: «Rect(0, 0, 100, 100, {fill: 'red'})».", '', "Rect(0, 0, 100, 100, {fill: 'red'})") }
              ]
            },
            { title: 'More shapes', sections: [{ type: 'doc', api: 'Line' }, { type: 'doc', api: 'Star' }, { type: 'doc', api: 'Label' }] }
          ],
          exercises: [
            gx('jg-1-1-e1', 'Flag', "Draw a flag: a «'navy'» rectangle «Rect(50, 50, 300, 200)», a «'white'» «Star» at «(200, 150)» with radius «60» and «5» points, and a «'saddleBrown'» pole «Rect(40, 50, 10, 330)».", '', "Rect(50, 50, 300, 200, {fill: 'navy'})\nStar(200, 150, 60, 5, {fill: 'white'})\nRect(40, 50, 10, 330, {fill: 'saddleBrown'})"),
            gx('jg-1-1-e2', 'Sign', "On a «'lightYellow'» background draw «Label('JS rocks', 200, 200, {size: 48, bold: true, fill: 'darkOrange'})» and underline it with a «Line(80, 235, 320, 235, {fill: 'darkOrange', lineWidth: 6})».", "app.background = 'lightYellow'\n", "app.background = 'lightYellow'\nLabel('JS rocks', 200, 200, {size: 48, bold: true, fill: 'darkOrange'})\nLine(80, 235, 320, 235, {fill: 'darkOrange', lineWidth: 6})")
          ]
        }
      ]
    },
    {
      id: 'jg-u2',
      title: 'Events and Animation',
      lessons: [
        {
          id: 'jg-2-1',
          title: 'Mouse and Keys',
          summary: 'React to clicks and key presses.',
          parts: [{ title: 'Events', sections: [{ type: 'doc', api: 'onMousePress' }, { type: 'doc', api: 'onKeyPress' }] }],
          exercises: [
            gx('jg-2-1-e1', 'Stamp', "Every click draws a «'hotPink'» «Star» with radius «20» and «5» points where you click.", "Label('Click to stamp stars', 200, 20, {size: 16})\n", "Label('Click to stamp stars', 200, 20, {size: 16})\n\nfunction onMousePress(mouseX, mouseY) {\n  Star(mouseX, mouseY, 20, 5, {fill: 'hotPink'})\n}", { tests: [{ label: 'Starts with just the label' }, { label: 'Two clicks, two stars', events: [{ type: 'mousePress', x: 100, y: 100 }, { type: 'mousePress', x: 250, y: 300 }] }] }),
            gx('jg-2-1-e2', 'Grow and shrink', "Press «'up'» to make the circle's radius 10 bigger and «'down'» to make it 10 smaller.", "const c = Circle(200, 200, 50, {fill: 'mediumSeaGreen'})\n", "const c = Circle(200, 200, 50, {fill: 'mediumSeaGreen'})\n\nfunction onKeyPress(key) {\n  if (key === 'up') c.radius += 10\n  else if (key === 'down') c.radius -= 10\n}", { tests: [{ label: 'Up twice', events: [{ type: 'keyPress', key: 'up' }, { type: 'keyPress', key: 'up' }] }, { label: 'Down once', events: [{ type: 'keyPress', key: 'down' }] }] })
          ]
        },
        {
          id: 'jg-2-2',
          title: 'Animation',
          summary: 'Move things every step.',
          parts: [{ title: 'onStep', sections: [{ type: 'doc', api: 'onStep' }, { type: 'doc', api: 'hitsShape' }] }],
          exercises: [
            gx('jg-2-2-e1', 'Falling snow', "Every step, move the snowflake down «4» pixels. When its «top» goes past «400», put its «bottom» back at «0».", "const flake = Star(200, 0, 15, 6, {fill: 'white'})\napp.background = 'midnightBlue'\n", "const flake = Star(200, 0, 15, 6, {fill: 'white'})\napp.background = 'midnightBlue'\n\nfunction onStep() {\n  flake.centerY += 4\n  if (flake.top > 400) flake.bottom = 0\n}", { points: 2, tests: [{ label: 'After 20 steps', events: [{ type: 'step', count: 20 }] }, { label: 'Wraps around after 110 steps', events: [{ type: 'step', count: 110 }] }] })
          ]
        }
      ]
    }
  ]
}

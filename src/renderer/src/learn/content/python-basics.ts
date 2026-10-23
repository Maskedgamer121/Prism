import type { Exercise, LearnTest, Track } from '@shared/learn'

function cx(id: string, title: string, prompt: string, starter: string, solution: string, tests: LearnTest[] = [{ label: 'Output matches' }], extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'console', prompt, starter, solution, tests, points: 1, ...extra }
}
const input = (label: string, stdin: string): LearnTest => ({ label, stdin })

export const PYTHON_BASICS: Track = {
  id: 'python-basics',
  language: 'python',
  kind: 'console',
  title: 'Python Basics',
  tagline: 'The core of Python: text, numbers, decisions, loops, functions, lists and dictionaries.',
  level: 'Beginner',
  docs: 'python-basics',
  units: [
    {
      id: 'pb-u1',
      title: 'Talking to the Computer',
      lessons: [
        {
          id: 'pb-1-1',
          title: 'Printing',
          summary: 'Show text and numbers in the console.',
          parts: [
            {
              title: 'Your first program',
              sections: [
                { type: 'text', md: 'A program is a list of instructions the computer follows **from top to bottom**. The «print» function shows things in the console. Press **Run**:' },
                { type: 'example', code: "print('Hello, world!')\nprint('Python is fun')" },
                { type: 'doc', api: 'print' },
                { type: 'callout', tone: 'tip', md: "Text inside quotes is a **string**. Numbers don't need quotes: «print(2 + 3)» prints «5», but «print('2 + 3')» prints «2 + 3»." },
                { type: 'checkpoint', exercise: cx('pb-1-1-cp1', 'Say hi', 'Print exactly «Hi, Prism!»', '', "print('Hi, Prism!')") }
              ]
            }
          ],
          exercises: [
            cx('pb-1-1-e1', 'A tiny poem', 'Print these three lines exactly:\n\n```\nRoses are red\nViolets are blue\nPython is awesome\n```', '', "print('Roses are red')\nprint('Violets are blue')\nprint('Python is awesome')"),
            cx('pb-1-1-e2', 'Math in print', 'Print the result of «365 * 24» (the hours in a year). Print the calculation, not the number you worked out yourself!', '', 'print(365 * 24)', undefined, { requires: [{ pattern: '365\\s*\\*\\s*24', message: 'Let Python do the math: print(365 * 24).' }] })
          ]
        },
        {
          id: 'pb-1-2',
          title: 'Variables and Math',
          summary: 'Store values in names and calculate with them.',
          parts: [
            {
              title: 'Variables',
              sections: [
                { type: 'doc', api: 'Variables' },
                { type: 'doc', api: 'Math operators' },
                { type: 'checkpoint', exercise: cx('pb-1-2-cp1', 'Rectangle area', 'Make variables «width = 7» and «height = 5», then print «Area: 35» using them: «print(\'Area:\', width * height)».', 'width = 7\nheight = 5\n', "width = 7\nheight = 5\nprint('Area:', width * height)") }
              ]
            }
          ],
          exercises: [
            cx('pb-1-2-e1', 'Pizza party', 'There are «29» slices and «6» friends. Print how many whole slices each friend gets, then how many are left over, on two lines:\n\n```\nEach gets 4\nLeft over 5\n```\nUse «//» and «%».', 'slices = 29\nfriends = 6\n', "slices = 29\nfriends = 6\nprint('Each gets', slices // friends)\nprint('Left over', slices % friends)", undefined, { requires: [{ pattern: '//', message: 'Use «//» for whole-number division.' }, { pattern: '%', message: 'Use «%» for the remainder.' }] }),
            cx('pb-1-2-e2', 'Level up', 'Start with «xp = 50». Add «25» with «+=», then double it with «*=», then print it. (It should print «150».)', 'xp = 50\n', 'xp = 50\nxp += 25\nxp *= 2\nprint(xp)', undefined, { requires: [{ pattern: '\\+=', message: 'Use «+=».' }, { pattern: '\\*=', message: 'Use «*=».' }] })
          ]
        },
        {
          id: 'pb-1-3',
          title: 'Input and f-strings',
          summary: 'Ask the user questions and build sentences.',
          parts: [
            {
              title: 'Asking questions',
              sections: [
                { type: 'doc', api: 'input' },
                { type: 'doc', api: 'f-strings' },
                { type: 'doc', api: 'int / float / str' },
                { type: 'callout', tone: 'warn', md: "«input()» always gives back a **string**. «'3' + '4'» is «'34'», not «7»! Convert with «int(...)» first." }
              ]
            }
          ],
          exercises: [
            cx('pb-1-3-e1', 'Greeter', 'Read a name with «input()» (no prompt text) and print «Hello, NAME!» using an f-string.', '', "name = input()\nprint(f'Hello, {name}!')", [input('Name: Ada', 'Ada'), input('Name: Linus', 'Linus')]),
            cx('pb-1-3-e2', 'Adder', 'Read two whole numbers (one per line) and print their sum like «3 + 4 = 7».', 'a = int(input())\n', "a = int(input())\nb = int(input())\nprint(f'{a} + {b} = {a + b}')", [input('3 and 4', '3\n4'), input('10 and -2', '10\n-2')], { points: 2 })
          ]
        }
      ]
    },
    {
      id: 'pb-u2',
      title: 'Decisions and Loops',
      lessons: [
        {
          id: 'pb-2-1',
          title: 'If, Elif, Else',
          summary: 'Run different code depending on conditions.',
          parts: [{ title: 'Conditions', sections: [{ type: 'doc', api: 'if / elif / else' }] }],
          exercises: [
            cx('pb-2-1-e1', 'Even or odd', 'Read a whole number and print «even» or «odd».', 'n = int(input())\n', "n = int(input())\nif n % 2 == 0:\n    print('even')\nelse:\n    print('odd')", [input('4', '4'), input('7', '7'), input('0', '0')]),
            cx(
              'pb-2-1-e2',
              'Grade',
              'Read a score (0–100) and print the letter grade: «A» for 90 and up, «B» for 80–89, «C» for 70–79, otherwise «F».',
              'score = int(input())\n',
              "score = int(input())\nif score >= 90:\n    print('A')\nelif score >= 80:\n    print('B')\nelif score >= 70:\n    print('C')\nelse:\n    print('F')",
              [input('95', '95'), input('85', '85'), input('70', '70'), input('12', '12')],
              { points: 2 }
            )
          ]
        },
        {
          id: 'pb-2-2',
          title: 'Loops',
          summary: 'Repeat things with for and while.',
          parts: [{ title: 'for and while', sections: [{ type: 'doc', api: 'for / range' }, { type: 'doc', api: 'while' }] }],
          exercises: [
            cx('pb-2-2-e1', 'Countdown', 'Print the numbers «10» down to «1», one per line, then «Liftoff!».', '', "for i in range(10, 0, -1):\n    print(i)\nprint('Liftoff!')", undefined, { requires: [{ pattern: '\\b(for|while)\\b', message: 'Use a loop.' }] }),
            cx('pb-2-2-e2', 'Sum to n', 'Read a number «n» and print the sum «1 + 2 + … + n».', 'n = int(input())\ntotal = 0\n', 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)', [input('n = 5', '5'), input('n = 100', '100')], { requires: [{ pattern: '\\b(for|while)\\b', message: 'Use a loop.' }] }),
            cx('pb-2-2-e3', 'Times table', 'Read a number and print its times table from 1 to 5, like «3 x 1 = 3».', 'n = int(input())\n', "n = int(input())\nfor i in range(1, 6):\n    print(f'{n} x {i} = {n * i}')", [input('3', '3'), input('7', '7')], { points: 2 })
          ]
        }
      ]
    },
    {
      id: 'pb-u3',
      title: 'Organizing Code and Data',
      lessons: [
        {
          id: 'pb-3-1',
          title: 'Functions',
          summary: 'Name a piece of code and reuse it.',
          parts: [{ title: 'def and return', sections: [{ type: 'doc', api: 'def (functions)' }] }],
          exercises: [
            cx('pb-3-1-e1', 'Square it', 'Write a function «square(n)» that **returns** «n * n». Then print «square(4)» and «square(9)».', 'def square(n):\n    pass\n\nprint(square(4))\nprint(square(9))\n', 'def square(n):\n    return n * n\n\nprint(square(4))\nprint(square(9))\n', undefined, { requires: [{ pattern: 'def\\s+square', message: 'Define a function called «square».' }, { pattern: 'return', message: 'Use «return» to send the answer back.' }] }),
            cx('pb-3-1-e2', 'Shout', 'Write «shout(text)» that returns the text in capital letters with «!» on the end. Read a line and print «shout» of it.', 'def shout(text):\n    pass\n\n', 'def shout(text):\n    return text.upper() + \'!\'\n\nprint(shout(input()))\n', [input('hello', 'hello'), input('python rocks', 'python rocks')], { points: 2, hints: ['Look at String methods in the docs: «.upper()».'] })
          ]
        },
        {
          id: 'pb-3-2',
          title: 'Lists',
          summary: 'Keep many values in one place.',
          parts: [{ title: 'Lists', sections: [{ type: 'doc', api: 'Lists' }, { type: 'doc', api: 'String methods' }] }],
          exercises: [
            cx('pb-3-2-e1', 'Biggest number', 'Read a line of numbers separated by spaces, like «4 18 7», and print the biggest one.', 'numbers = [int(x) for x in input().split()]\n', 'numbers = [int(x) for x in input().split()]\nprint(max(numbers))', [input('4 18 7', '4 18 7'), input('-3 -9 -1', '-3 -9 -1')]),
            cx('pb-3-2-e2', 'Shopping list', 'Read 3 items (one per line) into a list, then print them numbered:\n\n```\n1. apples\n2. milk\n3. bread\n```', 'items = []\n', "items = []\nfor i in range(3):\n    items.append(input())\nfor i, item in enumerate(items):\n    print(f'{i + 1}. {item}')", [input('apples, milk, bread', 'apples\nmilk\nbread')], { points: 2, hints: ['«enumerate(items)» gives you each position and item together.'] })
          ]
        },
        {
          id: 'pb-3-3',
          title: 'Dictionaries',
          summary: 'Look values up by name.',
          parts: [{ title: 'Dictionaries', sections: [{ type: 'doc', api: 'Dictionaries' }] }],
          exercises: [
            cx(
              'pb-3-3-e1',
              'Word counter',
              'Read a sentence and count how many times each word appears. Print each word and its count in the order the words first appear, like «the 2».',
              'words = input().split()\ncounts = {}\n',
              "words = input().split()\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nfor w, c in counts.items():\n    print(w, c)",
              [input('the cat and the hat', 'the cat and the hat'), input('a a a b', 'a a a b')],
              { points: 3, hints: ['«counts.get(w, 0)» gives the current count, or 0 if the word is new.'] }
            )
          ]
        }
      ]
    }
  ]
}

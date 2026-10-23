import type { ApiDoc, Track } from '@shared/learn'
import { checkpoint, cx, doc, example, input, requires, text, tip } from './helpers'

export const PY_MORE_DOCS: ApiDoc[] = [
  {
    name: 'Slicing',
    category: 'Strings & lists',
    signature: 'seq[start:stop:step]',
    summary: 'Takes part of a string or list. «start» is included, «stop» is not; negative numbers count from the end; a step of «-1» reverses.',
    example: "word = 'python'\nprint(word[0:3], word[-3:], word[::2], word[::-1])\nnums = [10, 20, 30, 40, 50]\nprint(nums[1:4], nums[:2], nums[-1])"
  },
  {
    name: 'Comprehensions',
    category: 'Strings & lists',
    signature: '[expression for item in items if condition]',
    summary: 'Builds a new list (or set/dict) from another one in a single line.',
    example: "nums = [1, 2, 3, 4, 5, 6]\nsquares = [n * n for n in nums]\nevens = [n for n in nums if n % 2 == 0]\nlengths = {w: len(w) for w in ['hi', 'there']}\nprint(squares, evens, lengths)",
    tips: ['If a comprehension gets hard to read, a normal loop is better.']
  },
  {
    name: 'Tuples & sets',
    category: 'Strings & lists',
    signature: 'point = (3, 4)  /  seen = {1, 2, 3}',
    summary: 'A tuple is a list that can’t change — great for pairs like coordinates. A set holds unique values with fast «in» checks.',
    example: "x, y = (3, 4)\nprint(x + y)\nseen = set()\nfor c in 'banana':\n    seen.add(c)\nprint(sorted(seen), 'n' in seen)"
  },
  {
    name: 'sorted / key',
    category: 'Strings & lists',
    signature: 'sorted(items, key=function, reverse=False)',
    summary: 'Returns a new sorted list. «key» says what to sort by.',
    example: "words = ['kiwi', 'fig', 'banana']\nprint(sorted(words))\nprint(sorted(words, key=len))\nplayers = [('Ada', 30), ('Bo', 50), ('Cy', 40)]\nprint(sorted(players, key=lambda p: p[1], reverse=True))"
  },
  {
    name: 'try / except',
    category: 'Errors',
    signature: 'try:\n    …\nexcept ValueError:\n    …',
    summary: 'Runs code that might fail and handles the error instead of crashing. Catch specific errors like «ValueError» or «ZeroDivisionError».',
    example: "for text in ['42', 'abc']:\n    try:\n        n = int(text)\n        print('number', n)\n    except ValueError:\n        print('not a number:', text)",
    tips: ['«raise ValueError(\'message\')» signals a problem yourself.']
  },
  {
    name: 'class',
    category: 'Objects',
    signature: 'class Name:\n    def __init__(self, …):',
    summary: 'A class is a blueprint for objects that bundle data (attributes) and behaviour (methods). «__init__» sets up a new object; «self» is the object itself.',
    example: "class Player:\n    def __init__(self, name, hp=100):\n        self.name = name\n        self.hp = hp\n\n    def hit(self, damage):\n        self.hp = max(0, self.hp - damage)\n\n    def __str__(self):\n        return f'{self.name} ({self.hp} hp)'\n\np = Player('Ada')\np.hit(30)\nprint(p)",
    tips: ['«@dataclass» (from dataclasses) writes «__init__» for you for simple data classes.']
  },
  {
    name: 'Recursion',
    category: 'Functions',
    signature: 'def f(n):\n    if base_case: return …\n    return … f(smaller) …',
    summary: 'A function that calls itself on a smaller version of the problem. Every recursive function needs a **base case** that stops it.',
    example: "def countdown(n):\n    if n == 0:\n        print('Go!')\n        return\n    print(n)\n    countdown(n - 1)\n\ncountdown(3)"
  },
  {
    name: 'Big-O thinking',
    category: 'Algorithms',
    signature: 'O(1), O(log n), O(n), O(n log n), O(n²)',
    summary: 'How the work grows as the input grows. Looping once is O(n); a loop inside a loop is O(n²); halving each time (binary search) is O(log n). Sets and dicts look things up in O(1).',
    example: "nums = list(range(1, 11))\n# O(n): check every item\nprint(7 in nums)\n# O(1) on average: a set lookup\nprint(7 in set(nums))"
  }
]

export const PYTHON_INTERMEDIATE: Track = {
  id: 'python-intermediate',
  language: 'python',
  kind: 'console',
  title: 'Python Intermediate',
  tagline: 'Slicing, comprehensions, sorting, error handling, classes and recursion.',
  level: 'Intermediate',
  docs: 'python-more',
  units: [
    {
      id: 'pi-u1',
      title: 'Working with Data',
      lessons: [
        {
          id: 'pi-1-1',
          title: 'Slicing',
          summary: 'Take parts of strings and lists.',
          parts: [{ title: 'Slices', sections: [doc('Slicing'), checkpoint(cx('pi-1-1-cp1', 'Reverse it', 'Read a word and print it backwards using a slice.', 'word = input()\n', 'word = input()\nprint(word[::-1])', [input('python', 'python'), input('racecar', 'racecar')], { requires: [requires('\\[\\s*:\\s*:\\s*-1\\s*\\]', 'Use the slice «[::-1]».')] }))] }],
          exercises: [
            cx('pi-1-1-e1', 'Initials', 'Read a full name like «ada lovelace» and print the initials in capitals: «A.L.»', 'name = input()\n', "name = input()\nprint(''.join(part[0].upper() + '.' for part in name.split()))", [input('ada lovelace', 'ada lovelace'), input('grace brewster hopper', 'grace brewster hopper')]),
            cx('pi-1-1-e2', 'Middle', 'Read a list of numbers separated by spaces and print the list without its first and last items.', 'nums = input().split()\n', "nums = input().split()\nprint(' '.join(nums[1:-1]))", [input('1 2 3 4 5', '1 2 3 4 5'), input('9 8 7', '9 8 7')])
          ]
        },
        {
          id: 'pi-1-2',
          title: 'Comprehensions',
          summary: 'Build lists in one line.',
          parts: [{ title: 'Comprehensions', sections: [doc('Comprehensions'), doc('Tuples & sets')] }],
          exercises: [
            cx('pi-1-2-e1', 'Squares of evens', 'Read numbers separated by spaces. Print a list of the squares of only the even ones, using a comprehension.', 'nums = [int(x) for x in input().split()]\n', 'nums = [int(x) for x in input().split()]\nprint([n * n for n in nums if n % 2 == 0])', [input('1 2 3 4', '1 2 3 4'), input('5 6 10', '5 6 10')], { requires: [requires('\\[[^\\]]*for[^\\]]*if', 'Use a comprehension with an «if».')] }),
            cx('pi-1-2-e2', 'Unique letters', 'Read a word and print how many **different** letters it has.', 'word = input()\n', 'word = input()\nprint(len(set(word)))', [input('banana', 'banana'), input('mississippi', 'mississippi')])
          ]
        },
        {
          id: 'pi-1-3',
          title: 'Sorting',
          summary: 'sorted, key and lambda.',
          parts: [{ title: 'Sorting', sections: [doc('sorted / key')] }],
          exercises: [
            cx('pi-1-3-e1', 'By length', 'Read words separated by spaces and print them sorted by length (shortest first); words of equal length keep their order.', 'words = input().split()\n', "words = input().split()\nprint(' '.join(sorted(words, key=len)))", [input('banana fig apple kiwi', 'banana fig apple kiwi')]),
            cx(
              'pi-1-3-e2',
              'Leaderboard',
              'Read 3 lines like «Ada 30». Print the players from highest to lowest score as «1. Bo 50».',
              'players = []\nfor _ in range(3):\n    name, score = input().split()\n    players.append((name, int(score)))\n',
              "players = []\nfor _ in range(3):\n    name, score = input().split()\n    players.append((name, int(score)))\nfor i, (name, score) in enumerate(sorted(players, key=lambda p: p[1], reverse=True), start=1):\n    print(f'{i}. {name} {score}')",
              [input('Ada 30, Bo 50, Cy 40', 'Ada 30\nBo 50\nCy 40')],
              { points: 2 }
            )
          ]
        }
      ]
    },
    {
      id: 'pi-u2',
      title: 'Robust Code',
      lessons: [
        {
          id: 'pi-2-1',
          title: 'Handling Errors',
          summary: 'try, except and raise.',
          parts: [{ title: 'Errors', sections: [doc('try / except')] }],
          exercises: [
            cx(
              'pi-2-1-e1',
              'Safe divide',
              'Read two lines. Print the first divided by the second. If either isn’t a number print «not a number»; if the second is 0 print «cannot divide by zero».',
              'a = input()\nb = input()\n',
              "a = input()\nb = input()\ntry:\n    print(int(a) / int(b))\nexcept ValueError:\n    print('not a number')\nexcept ZeroDivisionError:\n    print('cannot divide by zero')",
              [input('10 / 4', '10\n4'), input('5 / 0', '5\n0'), input('x / 2', 'x\n2')],
              { points: 2, requires: [requires('except', 'Use try / except.')] }
            )
          ]
        },
        {
          id: 'pi-2-2',
          title: 'Classes',
          summary: 'Objects with data and methods.',
          parts: [{ title: 'Classes', sections: [doc('class'), tip('Method names and attributes are usually «snake_case»; class names are «PascalCase».')] }],
          exercises: [
            cx(
              'pi-2-2-e1',
              'Bank account',
              'Write a class «Account» with «balance» starting at 0, «deposit(amount)» and «withdraw(amount)» (which refuses — prints «insufficient funds» — if the balance is too low). Then run the given lines.',
              "class Account:\n    pass\n\nacc = Account()\nacc.deposit(50)\nacc.withdraw(80)\nacc.withdraw(20)\nprint(acc.balance)\n",
              "class Account:\n    def __init__(self):\n        self.balance = 0\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print('insufficient funds')\n        else:\n            self.balance -= amount\n\nacc = Account()\nacc.deposit(50)\nacc.withdraw(80)\nacc.withdraw(20)\nprint(acc.balance)\n",
              undefined,
              { points: 3, requires: [requires('class\\s+Account', 'Define the «Account» class.')] }
            )
          ]
        },
        {
          id: 'pi-2-3',
          title: 'Recursion',
          summary: 'Functions that call themselves.',
          parts: [{ title: 'Recursion', sections: [doc('Recursion'), example('def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))')] }],
          exercises: [
            cx('pi-2-3-e1', 'Sum of digits', 'Write a **recursive** «digit_sum(n)» (e.g. 1234 → 10). Read a number and print its digit sum.', 'def digit_sum(n):\n    pass\n\nprint(digit_sum(int(input())))\n', 'def digit_sum(n):\n    if n < 10:\n        return n\n    return n % 10 + digit_sum(n // 10)\n\nprint(digit_sum(int(input())))\n', [input('1234', '1234'), input('9', '9'), input('99999', '99999')], { points: 2, requires: [requires('digit_sum\\([^)]*//', 'Call digit_sum on a smaller number.')] })
          ]
        }
      ]
    }
  ]
}

export const PYTHON_PROBLEMS: Track = {
  id: 'python-problems',
  language: 'python',
  kind: 'console',
  title: 'Problem Solving in Python',
  tagline: 'Classic puzzles and algorithms: counting, searching, sorting and patterns — great prep for coding contests and interviews.',
  level: 'Intermediate',
  docs: 'python-more',
  units: [
    {
      id: 'pp-u1',
      title: 'Thinking in Steps',
      lessons: [
        {
          id: 'pp-1-1',
          title: 'Counting and Patterns',
          summary: 'Loops that find answers.',
          parts: [{ title: 'Plan first', sections: [text('Before coding, solve a tiny example **by hand** and write the steps in plain words. Then turn each step into code. Test with edge cases: empty input, one item, all the same.'), doc('Big-O thinking')] }],
          exercises: [
            cx('pp-1-1-e1', 'Palindrome', 'Read a phrase. Ignoring spaces and capital letters, print «yes» if it reads the same backwards, otherwise «no».', 'text = input()\n', "text = input()\nclean = text.replace(' ', '').lower()\nprint('yes' if clean == clean[::-1] else 'no')", [input('Never odd or even', 'Never odd or even'), input('Hello', 'Hello'), input('a', 'a')]),
            cx('pp-1-1-e2', 'Vowel count', 'Read a sentence and print how many vowels (a, e, i, o, u — any case) it has.', 'text = input()\n', "text = input()\nprint(sum(1 for c in text.lower() if c in 'aeiou'))", [input('Hello World', 'Hello World'), input('rhythm', 'rhythm')]),
            cx('pp-1-1-e3', 'FizzBuzz', 'Read «n» and print 1..n, but «Fizz» for multiples of 3, «Buzz» for 5 and «FizzBuzz» for both.', 'n = int(input())\n', "n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)", [input('15', '15')])
          ]
        },
        {
          id: 'pp-1-2',
          title: 'Searching',
          summary: 'Linear and binary search.',
          parts: [
            {
              title: 'Binary search',
              sections: [
                text('In a **sorted** list you can find a value much faster than checking every item: look at the middle, then throw away the half that can’t contain it. Each step halves the list — O(log n).'),
                example("def binary_search(items, target):\n    lo, hi = 0, len(items) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if items[mid] == target:\n            return mid\n        if items[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\nprint(binary_search([2, 5, 8, 12, 16, 23], 16))")
              ]
            }
          ],
          exercises: [
            cx('pp-1-2-e1', 'First repeat', 'Read words separated by spaces and print the first word that appears a second time, or «none». Use a set.', 'words = input().split()\nseen = set()\n', "words = input().split()\nseen = set()\nanswer = 'none'\nfor w in words:\n    if w in seen:\n        answer = w\n        break\n    seen.add(w)\nprint(answer)", [input('a b c b a', 'a b c b a'), input('x y z', 'x y z')], { points: 2 }),
            cx(
              'pp-1-2-e2',
              'Guess the number',
              'A number between 1 and 100 is hidden. Read it, then simulate binary-search guessing (always guess the middle of the remaining range, rounding down) and print each guess on its own line.',
              'secret = int(input())\nlo, hi = 1, 100\n',
              'secret = int(input())\nlo, hi = 1, 100\nwhile True:\n    guess = (lo + hi) // 2\n    print(guess)\n    if guess == secret:\n        break\n    if guess < secret:\n        lo = guess + 1\n    else:\n        hi = guess - 1',
              [input('37', '37'), input('100', '100'), input('50', '50')],
              { points: 3 }
            )
          ]
        },
        {
          id: 'pp-1-3',
          title: 'Sorting by Hand',
          summary: 'Write your own sort.',
          parts: [{ title: 'Selection sort', sections: [text('Python’s «sorted()» is fast and you should use it in real code — but writing a sort yourself teaches how algorithms work. **Selection sort**: find the smallest item, put it first, repeat for the rest.'), example('nums = [5, 2, 9, 1]\nfor i in range(len(nums)):\n    smallest = i\n    for j in range(i + 1, len(nums)):\n        if nums[j] < nums[smallest]:\n            smallest = j\n    nums[i], nums[smallest] = nums[smallest], nums[i]\nprint(nums)')] }],
          exercises: [
            cx(
              'pp-1-3-e1',
              'Bubble sort',
              'Read numbers separated by spaces and sort them with **bubble sort** (repeatedly swap neighbours that are out of order). Print the sorted numbers separated by spaces. Don’t use «sorted» or «.sort».',
              'nums = [int(x) for x in input().split()]\n',
              "nums = [int(x) for x in input().split()]\nfor i in range(len(nums)):\n    for j in range(len(nums) - 1 - i):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\nprint(' '.join(str(n) for n in nums))",
              [input('5 1 4 2 8', '5 1 4 2 8'), input('3 3 1', '3 3 1')],
              { points: 3 }
            )
          ]
        },
        {
          id: 'pp-1-4',
          title: 'Classic Recursion',
          summary: 'Fibonacci and more.',
          parts: [{ title: 'Remembering answers', sections: [text('Naive recursive Fibonacci recomputes the same values again and again. **Memoization** stores answers in a dict so each is computed once.'), example('memo = {}\ndef fib(n):\n    if n < 2:\n        return n\n    if n not in memo:\n        memo[n] = fib(n - 1) + fib(n - 2)\n    return memo[n]\n\nprint([fib(i) for i in range(10)], fib(80))')] }],
          exercises: [
            cx('pp-1-4-e1', 'Power of two?', 'Read a positive whole number and print «yes» if it is a power of two (1, 2, 4, 8, …) else «no». Write it recursively.', 'def is_power_of_two(n):\n    pass\n\nprint(\'yes\' if is_power_of_two(int(input())) else \'no\')\n', "def is_power_of_two(n):\n    if n == 1:\n        return True\n    if n % 2 == 1:\n        return False\n    return is_power_of_two(n // 2)\n\nprint('yes' if is_power_of_two(int(input())) else 'no')\n", [input('64', '64'), input('12', '12'), input('1', '1')], { points: 2 })
          ]
        }
      ]
    }
  ]
}

import type { ApiDoc } from '@shared/learn'

export const PYTHON_BASICS_DOCS: ApiDoc[] = [
  {
    name: 'print',
    category: 'Input & output',
    signature: "print(value1, value2, ..., sep=' ', end='\\n')",
    summary: 'Shows values in the console. Separate several values with commas; they are printed with a space between them.',
    params: [
      { name: 'value1, value2…', desc: 'Anything: text, numbers, variables, lists.' },
      { name: 'sep', desc: 'What goes between the values.', default: "' '" },
      { name: 'end', desc: 'What goes at the end. «end=\'\'» keeps the next print on the same line.', default: "'\\n'" }
    ],
    example: "print('Hello, world!')\nprint('I am', 12, 'years old')\nprint('a', 'b', 'c', sep='-')\nprint('no new line', end='')\nprint(' ...continued')"
  },
  {
    name: 'input',
    category: 'Input & output',
    signature: 'input(prompt)',
    summary: 'Waits for the user to type a line and press Enter, and gives back what they typed **as a string**.',
    params: [{ name: 'prompt', desc: 'Text shown before the user types.', default: "''" }],
    example: "name = input('What is your name? ')\nprint('Hi', name)",
    tips: ['Type your answer in the console box under the output, then press Enter.', 'Wrap it in «int(...)» to get a whole number: «age = int(input())».']
  },
  {
    name: 'Variables',
    category: 'Basics',
    signature: 'name = value',
    summary: 'A variable is a name for a value. «=» stores the value on the right in the name on the left. Use the name later to get the value back.',
    example: "score = 0\nscore = score + 10\nplayer = 'Ada'\nprint(player, 'has', score, 'points')",
    tips: ['Names can use letters, digits and «_», but can’t start with a digit. Case matters: «Score» and «score» are different.']
  },
  {
    name: 'Math operators',
    category: 'Numbers',
    signature: 'a + b, a - b, a * b, a / b, a // b, a % b, a ** b',
    summary: '«/» always gives a decimal. «//» divides and drops the remainder. «%» gives the remainder. «**» is “to the power of”.',
    example: "print(7 + 2, 7 - 2, 7 * 2)\nprint(7 / 2)   # 3.5\nprint(7 // 2)  # 3\nprint(7 % 2)   # 1\nprint(2 ** 10) # 1024",
    tips: ['«x += 5» is short for «x = x + 5». Also «-=», «*=», «/=».']
  },
  {
    name: 'int / float / str',
    category: 'Numbers',
    signature: 'int(value), float(value), str(value)',
    summary: 'Convert between types. «int(\'42\')» turns text into a number; «str(42)» turns a number into text.',
    example: "age = int('12')\nprint(age + 1)\nprice = float('2.50')\nprint(price * 2)\nprint('Level ' + str(3))"
  },
  {
    name: 'f-strings',
    category: 'Text',
    signature: "f'text {expression} text'",
    summary: 'Put «f» before a string to drop values right into it with «{ }».',
    example: "name = 'Ada'\nscore = 95\nprint(f'{name} scored {score} points')\nprint(f'Half of {score} is {score / 2}')\nprint(f'Rounded: {3.14159:.2f}')"
  },
  {
    name: 'String methods',
    category: 'Text',
    signature: 's.upper(), s.lower(), s.strip(), s.replace(a, b), s.split(), len(s)',
    summary: 'Strings have handy built-in tools. They give back a new string — the original doesn’t change.',
    example: "s = '  Hello World  '\nprint(s.strip())\nprint(s.upper())\nprint(s.replace('World', 'Python'))\nprint('a,b,c'.split(','))\nprint(len('hello'))\nprint('hello'[0], 'hello'[-1])"
  },
  {
    name: 'if / elif / else',
    category: 'Decisions',
    signature: 'if condition:\n    ...\nelif other:\n    ...\nelse:\n    ...',
    summary: 'Runs the indented block only when the condition is True. Compare with «==», «!=», «<», «>», «<=», «>=», and combine with «and», «or», «not».',
    example: "temp = 25\nif temp > 30:\n    print('Hot!')\nelif temp > 15:\n    print('Nice weather')\nelse:\n    print('Cold')",
    tips: ['«=» stores a value; «==» compares two values.', 'The block under an «if» must be indented (4 spaces).']
  },
  {
    name: 'for / range',
    category: 'Loops',
    signature: 'for i in range(start, stop, step):',
    summary: '«range» counts from «start» up to (but not including) «stop». The loop runs its block once for each number.',
    params: [
      { name: 'start', desc: 'First number.', default: '0' },
      { name: 'stop', desc: 'Stop before this number.' },
      { name: 'step', desc: 'How much to count by.', default: '1' }
    ],
    example: "for i in range(5):\n    print(i)\nfor i in range(2, 11, 2):\n    print('even:', i)\nfor letter in 'hey':\n    print(letter)"
  },
  {
    name: 'while',
    category: 'Loops',
    signature: 'while condition:',
    summary: 'Repeats as long as the condition stays True. Make sure something changes, or it loops forever!',
    example: "count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint('Liftoff!')",
    tips: ['«break» leaves a loop early; «continue» skips to the next round.']
  },
  {
    name: 'def (functions)',
    category: 'Functions',
    signature: 'def name(param1, param2):\n    return result',
    summary: 'A function is a named, reusable block of code. Parameters are its inputs and «return» sends a result back.',
    example: "def area(width, height):\n    return width * height\n\nprint(area(3, 4))\nprint(area(10, 2))"
  },
  {
    name: 'Lists',
    category: 'Collections',
    signature: 'items = [a, b, c]',
    summary: 'A list holds many values in order. Count positions from 0.',
    example: "fruits = ['apple', 'banana']\nfruits.append('cherry')\nprint(fruits[0], len(fruits))\nfor f in fruits:\n    print(f.upper())\nprint(sorted([3, 1, 2]), sum([1, 2, 3]), max([4, 9, 2]))",
    tips: ['«items[-1]» is the last item. «items[1:3]» is a slice.']
  },
  {
    name: 'Dictionaries',
    category: 'Collections',
    signature: "d = {'key': value}",
    summary: 'A dictionary looks values up by a key, like a word and its definition.',
    example: "ages = {'Ada': 12, 'Linus': 11}\nages['Grace'] = 13\nprint(ages['Ada'])\nfor name, age in ages.items():\n    print(name, 'is', age)\nprint('Ada' in ages)"
  }
]

export const JS_BASICS_DOCS: ApiDoc[] = [
  {
    name: 'console.log',
    category: 'Input & output',
    signature: 'console.log(value1, value2, ...)',
    summary: 'Prints values in the console, separated by spaces.',
    params: [{ name: 'value1, value2…', desc: 'Text, numbers, arrays, objects…' }],
    example: "console.log('Hello, world!')\nconsole.log('I am', 12, 'years old')\nconsole.log([1, 2, 3], { name: 'Ada' })"
  },
  {
    name: 'prompt',
    category: 'Input & output',
    signature: 'prompt(question)',
    summary: 'Asks the user to type a line and gives it back **as a string**. (In Prism you type the answer in the console box.)',
    params: [{ name: 'question', desc: 'Text shown before the user types.', default: "''" }],
    example: "const name = prompt('What is your name? ')\nconsole.log('Hi ' + name)",
    tips: ['Turn the answer into a number with «Number(...)»: «const age = Number(prompt())».']
  },
  {
    name: 'let / const',
    category: 'Basics',
    signature: 'let name = value  /  const name = value',
    summary: '«const» makes a name you won’t reassign; «let» makes one you will. Prefer «const» unless the value changes.',
    example: "const player = 'Ada'\nlet score = 0\nscore = score + 10\nscore += 5\nconsole.log(player, score)"
  },
  {
    name: 'Math',
    category: 'Numbers',
    signature: 'a + b, a - b, a * b, a / b, a % b, a ** b, Math.floor(x), Math.round(x), Math.random()',
    summary: '«/» can give decimals; «%» gives the remainder. The «Math» object has rounding, square roots, random numbers and more.',
    example: "console.log(7 / 2, 7 % 2, 2 ** 10)\nconsole.log(Math.floor(3.7), Math.round(3.5), Math.max(4, 9, 2))\nconsole.log(Math.floor(Math.random() * 6) + 1)"
  },
  {
    name: 'Strings & template literals',
    category: 'Text',
    signature: '`text ${expression}`',
    summary: 'Use backticks to drop values into text with «${ }». Strings also have methods like «toUpperCase()», «includes()», «slice()», «split()».',
    example: "const name = 'Ada'\nconst score = 95\nconsole.log(`${name} scored ${score} points`)\nconsole.log(name.toUpperCase(), name.length, name.includes('d'))\nconsole.log('a,b,c'.split(','))"
  },
  {
    name: 'if / else',
    category: 'Decisions',
    signature: 'if (condition) { ... } else if (other) { ... } else { ... }',
    summary: 'Runs a block only when its condition is true. Compare with «===», «!==», «<», «>», «<=», «>=»; combine with «&&» (and), «||» (or), «!» (not).',
    example: "const temp = 25\nif (temp > 30) {\n  console.log('Hot!')\n} else if (temp > 15) {\n  console.log('Nice weather')\n} else {\n  console.log('Cold')\n}",
    tips: ['Always use «===» (three equals) to compare values.']
  },
  {
    name: 'for / while',
    category: 'Loops',
    signature: 'for (let i = 0; i < n; i++) { ... }',
    summary: 'A «for» loop counts; «for…of» walks through each item of an array or string; «while» repeats while a condition is true.',
    example: "for (let i = 0; i < 3; i++) console.log('i is', i)\nfor (const c of 'hey') console.log(c)\nlet n = 3\nwhile (n > 0) {\n  console.log(n)\n  n--\n}"
  },
  {
    name: 'Functions',
    category: 'Functions',
    signature: 'function name(a, b) { return result }  /  const name = (a, b) => result',
    summary: 'A named, reusable block of code. Arrow functions are a shorter way to write small ones.',
    example: "function area(w, h) {\n  return w * h\n}\nconst double = (x) => x * 2\nconsole.log(area(3, 4), double(21))"
  },
  {
    name: 'Arrays',
    category: 'Collections',
    signature: 'const items = [a, b, c]',
    summary: 'An ordered list of values, counted from 0. Has methods like «push», «includes», «map», «filter», «join».',
    example: "const fruits = ['apple', 'banana']\nfruits.push('cherry')\nconsole.log(fruits[0], fruits.length)\nconsole.log(fruits.map((f) => f.toUpperCase()))\nconsole.log([5, 2, 9].filter((n) => n > 3))\nconsole.log(fruits.join(', '))"
  },
  {
    name: 'Objects',
    category: 'Collections',
    signature: "const obj = { key: value }",
    summary: 'Groups named values together. Read and write with «obj.key» or «obj[\'key\']».',
    example: "const pet = { name: 'Rex', age: 3 }\npet.age += 1\nconsole.log(pet.name, pet.age)\nfor (const [k, v] of Object.entries(pet)) console.log(k, '=', v)"
  }
]

export const LUA_BASICS_DOCS: ApiDoc[] = [
  {
    name: 'print',
    category: 'Input & output',
    signature: 'print(value1, value2, ...)',
    summary: 'Prints values to the output. Several values are separated by a tab. In Roblox Studio, print() shows up in the Output window.',
    example: "print('Hello, world!')\nprint('Score:', 10)\nio.write('no new line ')\nio.write('here\\n')"
  },
  {
    name: 'input / io.read',
    category: 'Input & output',
    signature: 'io.read()  /  input(prompt)',
    summary: 'Reads a line the user types (as a string). «input(prompt)» is a Prism helper that shows a prompt first. (Roblox games get input from events instead.)',
    example: "local name = input('What is your name? ')\nprint('Hi ' .. name)",
    tips: ['Use «tonumber(text)» to turn the text into a number.']
  },
  {
    name: 'local variables',
    category: 'Basics',
    signature: 'local name = value',
    summary: 'Always create variables with «local». Without it they become global, which causes bugs in bigger programs (and in Roblox scripts).',
    example: "local player = 'Ada'\nlocal score = 0\nscore = score + 10\nprint(player, score)",
    tips: ['Luau (Roblox) also lets you write «score += 10»; plain Lua 5.3 doesn’t.']
  },
  {
    name: 'Strings',
    category: 'Text',
    signature: "a .. b, #s, string.upper(s), string.format('%d', n)",
    summary: '«..» joins strings, «#» gives the length, and the «string» library has tools like «upper», «lower», «sub», «rep» and «format».',
    example: "local name = 'Ada'\nprint('Hello, ' .. name .. '!')\nprint(#name, string.upper(name), name:lower())\nprint(string.format('%s has %d coins', name, 42))\nprint(string.sub('Roblox', 1, 3))"
  },
  {
    name: 'Numbers',
    category: 'Numbers',
    signature: 'a + b, a - b, a * b, a / b, a // b, a % b, a ^ b, math.floor(x)',
    summary: '«/» gives decimals, «//» drops the remainder, «%» is the remainder and «^» is a power. The «math» library has «floor», «max», «random», «sqrt»…',
    example: "print(7 / 2, 7 // 2, 7 % 2, 2 ^ 10)\nprint(math.floor(3.7), math.max(4, 9, 2))\nprint(tonumber('42') + 1, tostring(5) .. '!')"
  },
  {
    name: 'if / elseif / else',
    category: 'Decisions',
    signature: 'if condition then ... elseif other then ... else ... end',
    summary: 'Runs a block only when the condition is true. Compare with «==», «~=» (not equal), «<», «>»; combine with «and», «or», «not». Only «nil» and «false» count as false.',
    example: "local temp = 25\nif temp > 30 then\n  print('Hot!')\nelseif temp > 15 then\n  print('Nice weather')\nelse\n  print('Cold')\nend"
  },
  {
    name: 'for / while / repeat',
    category: 'Loops',
    signature: 'for i = start, stop, step do ... end',
    summary: 'The numeric «for» counts from start to stop **including** stop. «while» repeats while true; «repeat … until» runs at least once.',
    example: "for i = 1, 3 do print('i =', i) end\nfor i = 10, 1, -3 do print(i) end\nlocal n = 3\nwhile n > 0 do\n  print(n)\n  n = n - 1\nend"
  },
  {
    name: 'functions',
    category: 'Functions',
    signature: 'local function name(a, b) return result end',
    summary: 'A reusable block of code. Functions can return several values at once.',
    example: "local function area(w, h)\n  return w * h\nend\nlocal function minMax(a, b)\n  if a < b then return a, b end\n  return b, a\nend\nprint(area(3, 4))\nprint(minMax(9, 2))"
  },
  {
    name: 'tables (arrays)',
    category: 'Tables',
    signature: 'local items = {a, b, c}',
    summary: 'Tables are Lua’s only data structure. As a list they start counting at **1**. «#items» is the length; «table.insert» adds; «ipairs» loops in order.',
    example: "local fruits = {'apple', 'banana'}\ntable.insert(fruits, 'cherry')\nprint(fruits[1], #fruits)\nfor i, fruit in ipairs(fruits) do\n  print(i, fruit)\nend\nprint(table.concat(fruits, ', '))"
  },
  {
    name: 'tables (dictionaries)',
    category: 'Tables',
    signature: 'local t = {key = value}',
    summary: 'Tables can also map keys to values, like a dictionary. Loop over them with «pairs» (in no particular order).',
    example: "local player = {name = 'Ada', coins = 10}\nplayer.coins = player.coins + 5\nprint(player.name, player['coins'])\nfor key, value in pairs(player) do\n  print(key, value)\nend"
  }
]

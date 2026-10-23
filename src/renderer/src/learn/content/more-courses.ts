import type { ApiDoc, Track } from '@shared/learn'
import { checkpoint, cx, doc, example, input, requires, text, tip } from './helpers'

export const JS_MORE_DOCS: ApiDoc[] = [
  {
    name: 'map / filter / reduce',
    category: 'Arrays',
    signature: 'arr.map(fn), arr.filter(fn), arr.reduce(fn, start)',
    summary: '«map» transforms every item, «filter» keeps items that pass a test, «reduce» combines everything into one value. They return new arrays and don’t change the original.',
    example: "const prices = [5, 12, 8, 20]\nconsole.log(prices.map((p) => p * 2))\nconsole.log(prices.filter((p) => p > 10))\nconsole.log(prices.reduce((sum, p) => sum + p, 0))"
  },
  {
    name: 'find / some / every / sort',
    category: 'Arrays',
    signature: 'arr.find(fn), arr.some(fn), arr.every(fn), arr.toSorted((a, b) => a - b)',
    summary: '«find» gives the first match, «some»/«every» answer yes/no questions. Sort numbers with a compare function — the default sort compares as text!',
    example: "const nums = [10, 9, 100, 1]\nconsole.log(nums.find((n) => n > 9), nums.some((n) => n > 50), nums.every((n) => n > 0))\nconsole.log([...nums].sort(), [...nums].sort((a, b) => a - b))"
  },
  {
    name: 'Destructuring & spread',
    category: 'Objects',
    signature: 'const { a, b } = obj; const [x, y] = arr; { ...obj, c: 1 }',
    summary: 'Pull values out of objects and arrays by name or position. «...» copies all items or properties into a new array or object.',
    example: "const player = { name: 'Ada', level: 3, hp: 90 }\nconst { name, level } = player\nconst healed = { ...player, hp: 100 }\nconst [first, ...rest] = [1, 2, 3]\nconsole.log(name, level, healed.hp, first, rest)"
  },
  {
    name: 'class',
    category: 'Objects',
    signature: 'class Name { constructor(…) { … } method() { … } }',
    summary: 'A blueprint for objects. «constructor» sets up each new object; «this» is the object; «extends» makes a subclass.',
    example: "class Animal {\n  constructor(name) { this.name = name }\n  speak() { return `${this.name} makes a sound` }\n}\nclass Dog extends Animal {\n  speak() { return `${this.name} barks` }\n}\nconsole.log(new Animal('Cat').speak(), new Dog('Rex').speak())"
  },
  {
    name: 'Closures',
    category: 'Functions',
    signature: 'function outer() { let x; return () => x }',
    summary: 'A function remembers the variables around it, even after the outer function has finished. Great for counters and private state.',
    example: 'function makeCounter() {\n  let count = 0\n  return () => ++count\n}\nconst next = makeCounter()\nconsole.log(next(), next(), next())'
  },
  {
    name: 'JSON',
    category: 'Data',
    signature: 'JSON.stringify(value), JSON.parse(text)',
    summary: 'JSON is the text format APIs use to send data. «stringify» turns objects into JSON text; «parse» turns it back.',
    example: "const save = { level: 4, items: ['sword', 'potion'] }\nconst text = JSON.stringify(save)\nconsole.log(text)\nconst loaded = JSON.parse(text)\nconsole.log(loaded.items.length)"
  }
]

export const JS_INTERMEDIATE: Track = {
  id: 'javascript-intermediate',
  language: 'javascript',
  kind: 'console',
  title: 'JavaScript Intermediate',
  tagline: 'Modern JavaScript the way it is written for the web: array methods, destructuring, classes, closures and JSON.',
  level: 'Intermediate',
  docs: 'js-more',
  units: [
    {
      id: 'ji-u1',
      title: 'Data Like a Pro',
      lessons: [
        {
          id: 'ji-1-1',
          title: 'Array Methods',
          summary: 'map, filter, reduce and friends.',
          parts: [{ title: 'Array methods', sections: [doc('map / filter / reduce'), doc('find / some / every / sort')] }],
          exercises: [
            cx('ji-1-1-e1', 'Discount', 'Read prices separated by spaces. Print a new list with 20% off each (use «map»), joined by spaces.', "const prices = prompt().split(' ').map(Number)\n", "const prices = prompt().split(' ').map(Number)\nconsole.log(prices.map((p) => p * 0.8).join(' '))", [input('10 25 50', '10 25 50')], { requires: [requires('\\.map\\(', 'Use «map».')] }),
            cx('ji-1-1-e2', 'Passing scores', 'Read scores separated by spaces. Print how many are 50 or more, then their average rounded to 1 decimal («toFixed(1)»).', "const scores = prompt().split(' ').map(Number)\n", "const scores = prompt().split(' ').map(Number)\nconst passing = scores.filter((s) => s >= 50)\nconsole.log(passing.length)\nconsole.log((passing.reduce((a, b) => a + b, 0) / passing.length).toFixed(1))", [input('40 70 90 55', '40 70 90 55')], { points: 2 })
          ]
        },
        {
          id: 'ji-1-2',
          title: 'Objects & Destructuring',
          summary: 'Unpack and copy data.',
          parts: [{ title: 'Destructuring', sections: [doc('Destructuring & spread'), doc('JSON')] }],
          exercises: [
            cx(
              'ji-1-2-e1',
              'Level up',
              'Given the «player» object, create a **new** object with every property copied but «level» increased by 1 (use spread). Print both levels like «3 4».',
              "const player = { name: 'Ada', level: 3, hp: 90 }\n",
              "const player = { name: 'Ada', level: 3, hp: 90 }\nconst next = { ...player, level: player.level + 1 }\nconsole.log(player.level, next.level)",
              undefined,
              { requires: [requires('\\.\\.\\.player', 'Copy the object with «...player».')] }
            ),
            cx('ji-1-2-e2', 'Parse save data', 'Read a line of JSON like «{"coins":5,"gems":2}» and print «coins: 5» and «gems: 2» on separate lines (in that order).', 'const save = JSON.parse(prompt())\n', "const save = JSON.parse(prompt())\nfor (const [k, v] of Object.entries(save)) console.log(`${k}: ${v}`)", [input('{"coins":5,"gems":2}', '{"coins":5,"gems":2}')])
          ]
        }
      ]
    },
    {
      id: 'ji-u2',
      title: 'Building Blocks',
      lessons: [
        {
          id: 'ji-2-1',
          title: 'Classes',
          summary: 'Blueprints for objects.',
          parts: [{ title: 'Classes', sections: [doc('class')] }],
          exercises: [
            cx(
              'ji-2-1-e1',
              'Stack',
              'Write a class «Stack» with «push(x)», «pop()» (returns the last item) and a «size» getter. Then run the given code.',
              'class Stack {\n\n}\n\nconst s = new Stack()\ns.push(1)\ns.push(2)\ns.push(3)\nconsole.log(s.pop(), s.size)\n',
              'class Stack {\n  #items = []\n  push(x) { this.#items.push(x) }\n  pop() { return this.#items.pop() }\n  get size() { return this.#items.length }\n}\n\nconst s = new Stack()\ns.push(1)\ns.push(2)\ns.push(3)\nconsole.log(s.pop(), s.size)\n',
              undefined,
              { points: 2 }
            )
          ]
        },
        {
          id: 'ji-2-2',
          title: 'Closures',
          summary: 'Functions that remember.',
          parts: [{ title: 'Closures', sections: [doc('Closures'), tip('This is how many libraries keep data private without classes.')] }],
          exercises: [
            cx('ji-2-2-e1', 'Multiplier factory', 'Write «makeMultiplier(n)» returning a function that multiplies its argument by «n». Print «double(5)» and «triple(5)».', 'function makeMultiplier(n) {\n\n}\nconst double = makeMultiplier(2)\nconst triple = makeMultiplier(3)\nconsole.log(double(5), triple(5))\n', 'function makeMultiplier(n) {\n  return (x) => x * n\n}\nconst double = makeMultiplier(2)\nconst triple = makeMultiplier(3)\nconsole.log(double(5), triple(5))\n')
          ]
        }
      ]
    }
  ]
}

export const LUA_MORE_DOCS: ApiDoc[] = [
  {
    name: 'string patterns',
    category: 'Text',
    signature: 'string.find, string.match, string.gmatch, string.gsub',
    summary: 'Lua patterns are a small version of regular expressions: «%d» digit, «%a» letter, «%s» space, «+» one or more, «*» zero or more.',
    example: "local s = 'Player42 scored 1500'\nprint(string.match(s, '%d+'))\nfor word in string.gmatch('red green blue', '%a+') do print(word) end\nprint((string.gsub('a-b-c', '-', ' ')))"
  },
  {
    name: 'closures',
    category: 'Functions',
    signature: 'local function make() local x = 0 return function() … end end',
    summary: 'A function keeps access to the local variables around it — like a private counter.',
    example: 'local function makeCounter()\n  local count = 0\n  return function()\n    count = count + 1\n    return count\n  end\nend\nlocal nextId = makeCounter()\nprint(nextId(), nextId(), nextId())'
  },
  {
    name: 'metatables & OOP',
    category: 'Objects',
    signature: 'local Class = {}; Class.__index = Class; setmetatable(obj, Class)',
    summary: 'Lua has no classes, but a metatable with «__index» lets objects share methods. This is exactly how Roblox ModuleScript “classes” are written.',
    example: "local Player = {}\nPlayer.__index = Player\n\nfunction Player.new(name)\n  local self = setmetatable({}, Player)\n  self.name = name\n  self.health = 100\n  return self\nend\n\nfunction Player:takeDamage(amount)\n  self.health = math.max(0, self.health - amount)\nend\n\nlocal p = Player.new('Noob')\np:takeDamage(30)\nprint(p.name, p.health)",
    tips: ['«obj:method()» is short for «obj.method(obj)» — the colon passes «self» for you.']
  },
  {
    name: 'varargs & table functions',
    category: 'Functions',
    signature: 'function f(...) local args = {...} end',
    summary: '«...» accepts any number of arguments. «table.sort», «table.concat», «table.remove» and «select(\'#\', ...)» are handy with them.',
    example: "local function sum(...)\n  local total = 0\n  for _, n in ipairs({...}) do total = total + n end\n  return total\nend\nprint(sum(1, 2, 3, 4))\nlocal t = {5, 1, 4}\ntable.sort(t)\nprint(table.concat(t, ','))"
  }
]

export const LUA_INTERMEDIATE: Track = {
  id: 'lua-intermediate',
  language: 'lua',
  kind: 'console',
  title: 'Lua Intermediate (Roblox patterns)',
  tagline: 'The patterns real Roblox games use: string patterns, closures, metatables and object-oriented modules.',
  level: 'Intermediate',
  docs: 'lua-more',
  units: [
    {
      id: 'li-u1',
      title: 'Power Tools',
      lessons: [
        {
          id: 'li-1-1',
          title: 'String Patterns',
          summary: 'Find and replace in text.',
          parts: [{ title: 'Patterns', sections: [doc('string patterns')] }],
          exercises: [
            cx('li-1-1-e1', 'Find the numbers', 'Read a line and print every number in it, one per line (use «gmatch» with «%d+»).', 'local line = io.read()\n', "local line = io.read()\nfor n in string.gmatch(line, '%d+') do\n  print(n)\nend", [input('gave 12 coins to 3 players', 'gave 12 coins to 3 players'), input('level 7', 'level 7')], { requires: [requires('gmatch', 'Use string.gmatch.')] }),
            cx('li-1-1-e2', 'Censor', "Read a chat message and replace every «bad» with «***» (use «gsub»). Print the result.", 'local msg = io.read()\n', "local msg = io.read()\nlocal clean = string.gsub(msg, 'bad', '***')\nprint(clean)", [input('this is bad, so bad', 'this is bad, so bad')])
          ]
        },
        {
          id: 'li-1-2',
          title: 'Closures and Varargs',
          summary: 'Functions that remember, and any number of arguments.',
          parts: [{ title: 'Functions', sections: [doc('closures'), doc('varargs & table functions')] }],
          exercises: [
            cx('li-1-2-e1', 'Average', 'Write «average(...)» returning the average of all its arguments. Print «average(2, 4, 6)» and «average(10)».', 'local function average(...)\n\nend\n\nprint(average(2, 4, 6))\nprint(average(10))\n', 'local function average(...)\n  local args = {...}\n  local total = 0\n  for _, n in ipairs(args) do total = total + n end\n  return total / #args\nend\n\nprint(average(2, 4, 6))\nprint(average(10))\n', undefined, { requires: [requires('\\.\\.\\.', 'Use «...» for the arguments.')] })
          ]
        }
      ]
    },
    {
      id: 'li-u2',
      title: 'Objects',
      lessons: [
        {
          id: 'li-2-1',
          title: 'Metatables and Classes',
          summary: 'The Roblox module class pattern.',
          parts: [
            {
              title: 'OOP in Lua',
              sections: [
                doc('metatables & OOP'),
                text('In Roblox you would put this in a ModuleScript ending with «return Player», then «local Player = require(path.to.Player)» in other scripts.'),
                checkpoint(
                  cx(
                    'li-2-1-cp1',
                    'Heal',
                    'Add a method «Player:heal(amount)» that raises health but never above «100». Run the given lines.',
                    "local Player = {}\nPlayer.__index = Player\n\nfunction Player.new(name)\n  local self = setmetatable({}, Player)\n  self.name = name\n  self.health = 50\n  return self\nend\n\n-- add Player:heal here\n\nlocal p = Player.new('Noob')\np:heal(30)\nprint(p.health)\np:heal(50)\nprint(p.health)\n",
                    "local Player = {}\nPlayer.__index = Player\n\nfunction Player.new(name)\n  local self = setmetatable({}, Player)\n  self.name = name\n  self.health = 50\n  return self\nend\n\nfunction Player:heal(amount)\n  self.health = math.min(100, self.health + amount)\nend\n\nlocal p = Player.new('Noob')\np:heal(30)\nprint(p.health)\np:heal(50)\nprint(p.health)\n"
                  )
                )
              ]
            }
          ],
          exercises: [
            cx(
              'li-2-1-e1',
              'Inventory class',
              'Write an «Inventory» class with «Inventory.new()», «inv:add(item)», «inv:has(item)» (true/false) and «inv:count()». Run the given lines.',
              "local Inventory = {}\nInventory.__index = Inventory\n\n-- write Inventory.new, add, has, count\n\nlocal inv = Inventory.new()\ninv:add('Sword')\ninv:add('Potion')\nprint(inv:has('Sword'), inv:has('Bow'), inv:count())\n",
              "local Inventory = {}\nInventory.__index = Inventory\n\nfunction Inventory.new()\n  return setmetatable({ items = {} }, Inventory)\nend\n\nfunction Inventory:add(item)\n  table.insert(self.items, item)\nend\n\nfunction Inventory:has(item)\n  for _, it in ipairs(self.items) do\n    if it == item then return true end\n  end\n  return false\nend\n\nfunction Inventory:count()\n  return #self.items\nend\n\nlocal inv = Inventory.new()\ninv:add('Sword')\ninv:add('Potion')\nprint(inv:has('Sword'), inv:has('Bow'), inv:count())\n",
              undefined,
              { points: 3, requires: [requires('setmetatable', 'Use setmetatable in Inventory.new.')] }
            )
          ]
        }
      ]
    }
  ]
}

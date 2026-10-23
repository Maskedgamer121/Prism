import type { ApiDoc, Track } from '@shared/learn'
import { checkpoint, cx, doc, example, input, requires, text, tip, warn } from './helpers'

export const TS_DOCS: ApiDoc[] = [
  {
    name: 'Type annotations',
    category: 'Basics',
    signature: 'let name: type = value',
    summary: 'TypeScript is JavaScript plus **types**. A type says what kind of value a variable holds, so mistakes are caught before the code runs. The basic types are «string», «number», «boolean», arrays like «number[]», and «null»/«undefined».',
    example: "const name: string = 'Ada'\nlet level: number = 3\nconst ready: boolean = true\nconst scores: number[] = [90, 85, 77]\nlevel = level + 1\nconsole.log(name, level, ready, scores)",
    tips: ['Often you don’t need to write the type: «const x = 5» is already known to be a number (type inference).']
  },
  {
    name: 'Functions',
    category: 'Basics',
    signature: 'function name(a: Type, b?: Type): ReturnType { … }',
    summary: 'Type each parameter and the return value. A «?» makes a parameter optional; «= value» gives it a default.',
    example: "function area(width: number, height: number): number {\n  return width * height\n}\nfunction greet(name: string, excited = false): string {\n  return excited ? `Hi ${name}!` : `Hi ${name}`\n}\nconsole.log(area(3, 4), greet('Ada'), greet('Bo', true))"
  },
  {
    name: 'Object types',
    category: 'Shapes of data',
    signature: 'type Player = { name: string; level: number; guild?: string }',
    summary: '«type» (or «interface») describes the shape of an object: which properties it has and their types. «?» marks an optional property.',
    example: "type Player = { name: string; level: number; guild?: string }\nconst p: Player = { name: 'Ada', level: 7 }\nfunction describe(pl: Player): string {\n  return `${pl.name} (lvl ${pl.level})${pl.guild ? ' of ' + pl.guild : ''}`\n}\nconsole.log(describe(p))",
    tips: ['«interface Player { … }» does almost the same thing; teams usually pick one style.']
  },
  {
    name: 'Union types',
    category: 'Shapes of data',
    signature: "type Direction = 'up' | 'down' | 'left' | 'right'",
    summary: 'A union means “one of these”. Unions of string literals are the modern way to describe a fixed set of choices.',
    example: "type Direction = 'up' | 'down' | 'left' | 'right'\nfunction move(d: Direction): number[] {\n  if (d === 'up') return [0, -1]\n  if (d === 'down') return [0, 1]\n  if (d === 'left') return [-1, 0]\n  return [1, 0]\n}\nconsole.log(move('left'))"
  },
  {
    name: 'Narrowing',
    category: 'Shapes of data',
    signature: "if (typeof x === 'string') { … }",
    summary: 'When a value could be several types, check which one it is with «typeof», «===», «in» or «Array.isArray». Inside the check, TypeScript knows the exact type.',
    example: "function format(value: string | number): string {\n  if (typeof value === 'number') return value.toFixed(2)\n  return value.toUpperCase()\n}\nconsole.log(format(3.14159), format('hi'))"
  },
  {
    name: 'Generics',
    category: 'Reusable code',
    signature: 'function first<T>(items: T[]): T | undefined',
    summary: 'A generic works with any type while keeping track of which one. «T» is a placeholder filled in when you call it.',
    example: "function first<T>(items: T[]): T | undefined {\n  return items[0]\n}\nconst n = first([3, 1, 2])\nconst s = first(['a', 'b'])\nconsole.log(n, s)"
  },
  {
    name: 'Arrays & Records',
    category: 'Reusable code',
    signature: 'string[], Array<number>, Record<string, number>',
    summary: '«Type[]» is a list. «Record<K, V>» is an object used as a dictionary from keys to values.',
    example: "const names: string[] = ['Ada', 'Bo']\nconst stock: Record<string, number> = { potion: 4, sword: 1 }\nstock.shield = 2\nfor (const [item, count] of Object.entries(stock)) console.log(item, count)"
  }
]

export const TS_BASICS: Track = {
  id: 'typescript-basics',
  language: 'typescript',
  kind: 'console',
  title: 'TypeScript Basics',
  tagline: 'JavaScript with types: catch bugs before you run your code. Used by most modern web apps.',
  level: 'Beginner–Intermediate',
  docs: 'ts-basics',
  units: [
    {
      id: 'ts-u1',
      title: 'Types',
      lessons: [
        {
          id: 'ts-1-1',
          title: 'Adding Types',
          summary: 'Annotations, inference and type errors.',
          parts: [
            {
              title: 'Why types?',
              sections: [
                text('TypeScript checks your code **as you type**. Try changing «level = level + 1» below to «level = \'four\'» — the editor underlines it in red before you even run it.'),
                doc('Type annotations'),
                warn('Check refuses code with type errors, so fix the red underlines first. Hover over one to read the message.'),
                checkpoint(cx('ts-1-1-cp1', 'Typed variables', 'Create «const city: string = \'Paris\'» and «const population: number = 2100000», then print them like «Paris 2100000».', '', "const city: string = 'Paris'\nconst population: number = 2100000\nconsole.log(city, population)", undefined, { requires: [requires(':\\s*string', 'Give city the type «string».'), requires(':\\s*number', 'Give population the type «number».')] }))
              ]
            }
          ],
          exercises: [
            cx('ts-1-1-e1', 'Fix the types', 'This program has a type error. Fix it so it prints «Total: 30».', "const price: number = 10\nconst quantity: number = '3'\nconsole.log('Total: ' + price * quantity)\n", "const price: number = 10\nconst quantity: number = 3\nconsole.log('Total: ' + price * quantity)\n", undefined, { hints: ['«quantity» is declared as a number, but its value is a string in quotes.'] }),
            cx('ts-1-1-e2', 'Score list', 'Make «const scores: number[] = [12, 7, 30]» and print the biggest score using «Math.max(...scores)».', '', 'const scores: number[] = [12, 7, 30]\nconsole.log(Math.max(...scores))', undefined, { requires: [requires('number\\[\\]', 'Type the list as «number[]».')] })
          ]
        },
        {
          id: 'ts-1-2',
          title: 'Typed Functions',
          summary: 'Parameters, return types and defaults.',
          parts: [{ title: 'Functions', sections: [doc('Functions')] }],
          exercises: [
            cx('ts-1-2-e1', 'Celsius', 'Write «toFahrenheit(c: number): number» that returns «c * 9 / 5 + 32». Read a number and print the result.', 'function toFahrenheit(c: number): number {\n\n}\n\nconst c = Number(prompt())\nconsole.log(toFahrenheit(c))\n', 'function toFahrenheit(c: number): number {\n  return c * 9 / 5 + 32\n}\n\nconst c = Number(prompt())\nconsole.log(toFahrenheit(c))\n', [input('100', '100'), input('0', '0'), input('-40', '-40')]),
            cx('ts-1-2-e2', 'Greeting', 'Write «greet(name: string, punctuation: string = \'.\'): string» returning «Hello, NAME» plus the punctuation. Print «greet(\'Ada\')» and «greet(\'Bo\', \'!\')».', '', "function greet(name: string, punctuation: string = '.'): string {\n  return 'Hello, ' + name + punctuation\n}\nconsole.log(greet('Ada'))\nconsole.log(greet('Bo', '!'))", undefined, { requires: [requires('\\):\\s*string', 'Give greet a «string» return type.')] })
          ]
        }
      ]
    },
    {
      id: 'ts-u2',
      title: 'Shapes of Data',
      lessons: [
        {
          id: 'ts-2-1',
          title: 'Object Types',
          summary: 'type and interface.',
          parts: [{ title: 'Object types', sections: [doc('Object types')] }],
          exercises: [
            cx(
              'ts-2-1-e1',
              'Inventory item',
              'Define «type Item = { name: string; price: number; qty: number }». Make a list of these items: Potion 25×3, Sword 150×1. Print the total value of the list («225»).',
              'type Item = {\n\n}\n',
              "type Item = { name: string; price: number; qty: number }\nconst items: Item[] = [\n  { name: 'Potion', price: 25, qty: 3 },\n  { name: 'Sword', price: 150, qty: 1 }\n]\nlet total = 0\nfor (const it of items) total += it.price * it.qty\nconsole.log(total)",
              undefined,
              { points: 2, requires: [requires('type\\s+Item|interface\\s+Item', 'Define the «Item» type.')] }
            )
          ]
        },
        {
          id: 'ts-2-2',
          title: 'Unions and Narrowing',
          summary: 'One of several types, and checking which.',
          parts: [{ title: 'Unions', sections: [doc('Union types'), doc('Narrowing'), tip('Prefer union types like «\'small\' | \'large\'» over «enum» — they are simpler and work everywhere.')] }],
          exercises: [
            cx(
              'ts-2-2-e1',
              'Traffic light',
              "Define «type Light = 'red' | 'yellow' | 'green'» and «next(l: Light): Light» (red→green→yellow→red). Starting at «'red'», print the next 4 lights.",
              "type Light = 'red' | 'yellow' | 'green'\n",
              "type Light = 'red' | 'yellow' | 'green'\nfunction next(l: Light): Light {\n  if (l === 'red') return 'green'\n  if (l === 'green') return 'yellow'\n  return 'red'\n}\nlet light: Light = 'red'\nfor (let i = 0; i < 4; i++) {\n  light = next(light)\n  console.log(light)\n}",
              undefined,
              { points: 2 }
            ),
            cx(
              'ts-2-2-e2',
              'Describe',
              "Write «describe(x: string | number | boolean): string» that returns «'text of length N'» for strings, «'number N'» for numbers and «'yes'»/«'no'» for booleans. Print it for «'hey'», «42» and «false».",
              '',
              "function describe(x: string | number | boolean): string {\n  if (typeof x === 'string') return 'text of length ' + x.length\n  if (typeof x === 'number') return 'number ' + x\n  return x ? 'yes' : 'no'\n}\nconsole.log(describe('hey'))\nconsole.log(describe(42))\nconsole.log(describe(false))",
              undefined,
              { requires: [requires('typeof', 'Use «typeof» to narrow the type.')] }
            )
          ]
        },
        {
          id: 'ts-2-3',
          title: 'Generics and Records',
          summary: 'Reusable typed code.',
          parts: [{ title: 'Generics', sections: [doc('Generics'), doc('Arrays & Records'), example("function last<T>(items: T[]): T {\n  return items[items.length - 1]\n}\nconsole.log(last([1, 2, 3]), last(['x', 'y']))")] }],
          exercises: [
            cx(
              'ts-2-3-e1',
              'Count words',
              'Read a line of words and count them into a «Record<string, number>». Print each word and count in the order words first appear, like «the 2».',
              "const words = (prompt() ?? '').split(' ')\nconst counts: Record<string, number> = {}\n",
              "const words = (prompt() ?? '').split(' ')\nconst counts: Record<string, number> = {}\nfor (const w of words) counts[w] = (counts[w] ?? 0) + 1\nfor (const [w, c] of Object.entries(counts)) console.log(w, c)",
              [input('the cat and the hat', 'the cat and the hat'), input('a b a', 'a b a')],
              { points: 2 }
            ),
            cx(
              'ts-2-3-e2',
              'Pick a field',
              'Write a generic «pluck<T, K extends keyof T>(items: T[], key: K): T[K][]» that returns that property from every item. Print «pluck(players, \'name\')» joined with commas.',
              "type Player = { name: string; level: number }\nconst players: Player[] = [{ name: 'Ada', level: 3 }, { name: 'Bo', level: 5 }]\n",
              "type Player = { name: string; level: number }\nconst players: Player[] = [{ name: 'Ada', level: 3 }, { name: 'Bo', level: 5 }]\nfunction pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {\n  return items.map((it) => it[key])\n}\nconsole.log(pluck(players, 'name').join(','))",
              undefined,
              { points: 3, requires: [requires('<\\s*T', 'Make «pluck» generic.')] }
            )
          ]
        }
      ]
    }
  ]
}

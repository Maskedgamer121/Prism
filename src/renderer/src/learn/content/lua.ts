import type { Exercise, LearnTest, Track } from '@shared/learn'

function cx(id: string, title: string, prompt: string, starter: string, solution: string, tests: LearnTest[] = [{ label: 'Output matches' }], extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'console', prompt, starter, solution, tests, points: 1, ...extra }
}
const input = (label: string, stdin: string): LearnTest => ({ label, stdin })

const ROBLOX = (md: string) => ({ type: 'callout' as const, tone: 'tip' as const, md: `**In Roblox:** ${md}` })

export const LUA_BASICS: Track = {
  id: 'lua-basics',
  language: 'lua',
  kind: 'console',
  title: 'Lua for Roblox',
  tagline: 'The language behind Roblox games: variables, logic, loops, functions and tables.',
  level: 'Beginner',
  docs: 'lua-basics',
  units: [
    {
      id: 'lb-u1',
      title: 'Lua Basics',
      lessons: [
        {
          id: 'lb-1-1',
          title: 'Printing and Locals',
          summary: 'print, comments and local variables.',
          parts: [
            {
              title: 'Printing',
              sections: [
                { type: 'text', md: 'Roblox scripts are written in **Luau**, a version of Lua. Everything here works in Roblox Studio too. «--» starts a comment.' },
                { type: 'doc', api: 'print' },
                ROBLOX('«print()» writes to the **Output** window in Studio — the best way to see what your script is doing.'),
                { type: 'checkpoint', exercise: cx('lb-1-1-cp1', 'Hello', 'Print exactly «Hello from Lua!»', '', "print('Hello from Lua!')") }
              ]
            },
            { title: 'Variables', sections: [{ type: 'doc', api: 'local variables' }] }
          ],
          exercises: [
            cx('lb-1-1-e1', 'Player stats', "Make «local name = 'Noob'» and «local health = 100», then print «Noob has 100 health» by joining with «..».", "local name = 'Noob'\n", "local name = 'Noob'\nlocal health = 100\nprint(name .. ' has ' .. health .. ' health')", undefined, { requires: [{ pattern: '\\.\\.', message: 'Join the strings with «..».' }] }),
            cx('lb-1-1-e2', 'Damage', 'Start with «local health = 100». Subtract «35», then subtract «20», then print the health («45»).', 'local health = 100\n', 'local health = 100\nhealth = health - 35\nhealth = health - 20\nprint(health)')
          ]
        },
        {
          id: 'lb-1-2',
          title: 'Strings and Numbers',
          summary: 'Joining text, string library, math.',
          parts: [{ title: 'Text and math', sections: [{ type: 'doc', api: 'Strings' }, { type: 'doc', api: 'Numbers' }, { type: 'doc', api: 'input / io.read' }] }],
          exercises: [
            cx('lb-1-2-e1', 'Shout', 'Read a line and print it in capital letters.', 'local text = io.read()\n', 'local text = io.read()\nprint(string.upper(text))', [input('hello', 'hello'), input('roblox studio', 'roblox studio')]),
            cx('lb-1-2-e2', 'Coins', "Read a number of coins and print «You have N coins (M gems)» where a gem is worth 100 coins (use «//»).", 'local coins = tonumber(io.read())\n', "local coins = tonumber(io.read())\nprint('You have ' .. coins .. ' coins (' .. coins // 100 .. ' gems)')", [input('250', '250'), input('99', '99')], { points: 2 })
          ]
        }
      ]
    },
    {
      id: 'lb-u2',
      title: 'Logic and Loops',
      lessons: [
        {
          id: 'lb-2-1',
          title: 'If Statements',
          summary: 'if, elseif, else and end.',
          parts: [{ title: 'Decisions', sections: [{ type: 'doc', api: 'if / elseif / else' }, ROBLOX('you’ll use «if» constantly — e.g. «if humanoid.Health <= 0 then … end».')] }],
          exercises: [
            cx('lb-2-1-e1', 'Health bar', 'Read the health. Print «Healthy» if it is above 70, «Hurt» if above 30, «Critical» if above 0, otherwise «Defeated».', 'local health = tonumber(io.read())\n', "local health = tonumber(io.read())\nif health > 70 then\n  print('Healthy')\nelseif health > 30 then\n  print('Hurt')\nelseif health > 0 then\n  print('Critical')\nelse\n  print('Defeated')\nend", [input('90', '90'), input('50', '50'), input('5', '5'), input('0', '0')], { points: 2 })
          ]
        },
        {
          id: 'lb-2-2',
          title: 'Loops',
          summary: 'for, while and repeat.',
          parts: [{ title: 'Loops', sections: [{ type: 'doc', api: 'for / while / repeat' }, ROBLOX('a numeric «for» loop is how you spawn rows of parts: «for i = 1, 10 do … end».')] }],
          exercises: [
            cx('lb-2-2-e1', 'Countdown', 'Print «5» down to «1», then «Go!».', '', "for i = 5, 1, -1 do\n  print(i)\nend\nprint('Go!')", undefined, { requires: [{ pattern: '\\bfor\\b|\\bwhile\\b', message: 'Use a loop.' }] }),
            cx('lb-2-2-e2', 'Even numbers', 'Read «n» and print every even number from «2» to «n».', 'local n = tonumber(io.read())\n', 'local n = tonumber(io.read())\nfor i = 2, n, 2 do\n  print(i)\nend', [input('n = 10', '10'), input('n = 5', '5')])
          ]
        }
      ]
    },
    {
      id: 'lb-u3',
      title: 'Functions and Tables',
      lessons: [
        {
          id: 'lb-3-1',
          title: 'Functions',
          summary: 'local function … end.',
          parts: [{ title: 'Functions', sections: [{ type: 'doc', api: 'functions' }, ROBLOX('events call your functions: «part.Touched:Connect(onTouched)».')] }],
          exercises: [
            cx('lb-3-1-e1', 'Damage function', 'Write «local function takeDamage(health, amount)» that returns the new health, but never below «0» (use «math.max»). Print «takeDamage(100, 30)» and «takeDamage(20, 50)».', 'local function takeDamage(health, amount)\n\nend\n\nprint(takeDamage(100, 30))\nprint(takeDamage(20, 50))\n', 'local function takeDamage(health, amount)\n  return math.max(health - amount, 0)\nend\n\nprint(takeDamage(100, 30))\nprint(takeDamage(20, 50))\n', undefined, { requires: [{ pattern: 'return', message: 'Use «return».' }] })
          ]
        },
        {
          id: 'lb-3-2',
          title: 'Tables',
          summary: 'Lists and dictionaries in one structure.',
          parts: [
            {
              title: 'Tables',
              sections: [
                { type: 'doc', api: 'tables (arrays)' },
                { type: 'doc', api: 'tables (dictionaries)' },
                ROBLOX('«game.Players:GetPlayers()» gives a table you loop over with «ipairs», and player data is often kept in dictionaries.')
              ]
            }
          ],
          exercises: [
            cx('lb-3-2-e1', 'Inventory', "Make a table «inventory» with «'Sword'», «'Shield'», «'Potion'». Add «'Bow'» with «table.insert», then print each item with its number like «1. Sword».", 'local inventory = {}\n', "local inventory = {'Sword', 'Shield', 'Potion'}\ntable.insert(inventory, 'Bow')\nfor i, item in ipairs(inventory) do\n  print(i .. '. ' .. item)\nend", undefined, { requires: [{ pattern: 'table\\.insert', message: 'Add the bow with «table.insert».' }, { pattern: 'ipairs', message: 'Loop with «ipairs».' }] }),
            cx(
              'lb-3-2-e2',
              'Leaderboard',
              "Given the scores table, print the name of the player with the most points and their score, like «Top: Ana 50». (Loop with «pairs» and keep track of the best.)",
              "local scores = {Ana = 50, Ben = 35, Cy = 42}\n",
              "local scores = {Ana = 50, Ben = 35, Cy = 42}\nlocal bestName, bestScore = nil, -1\nfor name, score in pairs(scores) do\n  if score > bestScore then\n    bestName, bestScore = name, score\n  end\nend\nprint('Top: ' .. bestName .. ' ' .. bestScore)",
              undefined,
              { points: 3, hints: ['Start with «local bestName, bestScore = nil, -1» and update both when you find a bigger score.'] }
            )
          ]
        }
      ]
    }
  ]
}

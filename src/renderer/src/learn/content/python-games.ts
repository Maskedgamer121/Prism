import type { ApiDoc, Track } from '@shared/learn'
import { checkpoint, click, doc, example, gx, key, requires, steps, text, tip } from './helpers'
import { graphicsDocs } from './graphics-docs'

export const PY_GAMES_DOCS: ApiDoc[] = [
  ...graphicsDocs('python'),
  {
    name: 'Drawing functions',
    category: 'Game building',
    signature: 'def drawThing(x, y):\n    …',
    summary: 'Put the code for a drawing in a function with parameters for its position, then call it as many times as you like.',
    example: "def drawTree(x, y):\n    Rect(x - 8, y, 16, 40, fill='saddleBrown')\n    Circle(x, y, 30, fill='forestGreen')\n\ndrawTree(100, 250)\ndrawTree(200, 220)\ndrawTree(300, 260)"
  },
  {
    name: 'Lists of shapes',
    category: 'Game building',
    signature: 'app.balls = []  /  app.balls.append(shape)',
    summary: 'Games have many enemies, coins or bullets. Keep them in a list on «app», add to it, and loop over it every step.',
    example: "app.balls = []\nLabel('Click to drop balls', 200, 20)\n\ndef onMousePress(mouseX, mouseY):\n    app.balls.append(Circle(mouseX, mouseY, 12, fill='crimson'))\n\ndef onStep():\n    for ball in app.balls:\n        ball.centerY += 4",
    tips: ['To remove a shape from the game: «ball.visible = False» or «ball.remove()», and «app.balls.remove(ball)».']
  },
  {
    name: 'randrange & choice',
    category: 'Game building',
    signature: 'from random import randrange, choice',
    summary: '«randrange(a, b)» gives a random whole number from «a» up to (not including) «b». «choice(list)» picks a random item. Great for enemy positions and colors.',
    example: "from random import randrange, choice\n\nfor i in range(30):\n    Circle(randrange(0, 400), randrange(0, 400), randrange(5, 25), fill=choice(['gold', 'tomato', 'skyBlue']))",
    tips: ['Graded exercises avoid randomness so they can be checked — but use it freely in your own games!']
  }
]

export const PYTHON_GAMES: Track = {
  id: 'python-games',
  language: 'python',
  kind: 'graphics',
  title: 'Python Games',
  tagline: 'Level up from drawings to real games: functions, lists of enemies, collisions, score and a full Pong.',
  level: 'Intermediate',
  docs: 'python-games',
  units: [
    {
      id: 'gm-u1',
      title: 'Game Building Blocks',
      lessons: [
        {
          id: 'gm-1-1',
          title: 'Drawing Functions',
          summary: 'Reuse drawings with parameters.',
          parts: [
            {
              title: 'Functions with parameters',
              sections: [
                doc('Drawing functions'),
                checkpoint(
                  gx(
                    'gm-1-1-cp1',
                    'Snowflakes',
                    "Write «drawFlake(x, y)» that draws a «'lightBlue'» «Star» with radius «20» and «6» points at «(x, y)». Call it for «(100, 100)», «(300, 120)» and «(200, 300)».",
                    "app.background = 'midnightBlue'\n\ndef drawFlake(x, y):\n    pass\n",
                    "app.background = 'midnightBlue'\n\ndef drawFlake(x, y):\n    Star(x, y, 20, 6, fill='lightBlue')\n\ndrawFlake(100, 100)\ndrawFlake(300, 120)\ndrawFlake(200, 300)",
                    { requires: [requires('def\\s+drawFlake', 'Define drawFlake.')] }
                  )
                )
              ]
            }
          ],
          exercises: [
            gx(
              'gm-1-1-e1',
              'Village',
              "Write «drawHouse(x, y)» where «(x, y)» is the house's top-left: a «'tan'» body «Rect(x, y, 80, 60)», a «'firebrick'» roof «Polygon(x - 10, y, x + 40, y - 40, x + 90, y)» and a «'saddleBrown'» door «Rect(x + 30, y + 25, 20, 35)». Draw houses at «(40, 300)», «(160, 280)» and «(280, 300)».",
              "app.background = 'lightGreen'\n\ndef drawHouse(x, y):\n    pass\n",
              "app.background = 'lightGreen'\n\ndef drawHouse(x, y):\n    Rect(x, y, 80, 60, fill='tan')\n    Polygon(x - 10, y, x + 40, y - 40, x + 90, y, fill='firebrick')\n    Rect(x + 30, y + 25, 20, 35, fill='saddleBrown')\n\ndrawHouse(40, 300)\ndrawHouse(160, 280)\ndrawHouse(280, 300)",
              { points: 2, requires: [requires('def\\s+drawHouse', 'Define drawHouse.')] }
            )
          ]
        },
        {
          id: 'gm-1-2',
          title: 'Lists of Shapes',
          summary: 'Many things moving at once.',
          parts: [{ title: 'Lists on app', sections: [doc('Lists of shapes'), doc('randrange & choice')] }],
          exercises: [
            gx(
              'gm-1-2-e1',
              'Rain',
              "Each click adds a «'dodgerBlue'» raindrop «Oval(mouseX, mouseY, 6, 16)» to «app.drops». Every step, every drop falls «5» pixels.",
              "app.background = 'lightSlateGray'\nLabel('Click to make it rain', 200, 20, size=16, fill='white')\napp.drops = []\n\ndef onMousePress(mouseX, mouseY):\n    pass\n\ndef onStep():\n    pass\n",
              "app.background = 'lightSlateGray'\nLabel('Click to make it rain', 200, 20, size=16, fill='white')\napp.drops = []\n\ndef onMousePress(mouseX, mouseY):\n    app.drops.append(Oval(mouseX, mouseY, 6, 16, fill='dodgerBlue'))\n\ndef onStep():\n    for drop in app.drops:\n        drop.centerY += 5\n",
              {
                points: 2,
                tests: [
                  { label: 'Starts empty' },
                  { label: 'Two drops fall', events: [click(100, 50), click(300, 80), steps(10)] },
                  { label: 'A later drop falls less', events: [click(100, 50), steps(10), click(200, 50), steps(5)] }
                ]
              }
            )
          ]
        }
      ]
    },
    {
      id: 'gm-u2',
      title: 'Making Games',
      lessons: [
        {
          id: 'gm-2-1',
          title: 'Collisions and Score',
          summary: 'Touching things and keeping score.',
          parts: [
            {
              title: 'hitsShape',
              sections: [
                doc('hitsShape'),
                text('Keep the score on «app» and show it with a «Label» whose «value» you update.'),
                example("app.score = 0\nscoreLabel = Label('Score: 0', 60, 20, size=16)\ncoin = Circle(300, 200, 15, fill='gold')\nplayer = Rect(50, 185, 30, 30, fill='royalBlue')\n\ndef onKeyPress(key):\n    if key == 'right':\n        player.centerX += 25\n    if player.hitsShape(coin) and coin.visible:\n        coin.visible = False\n        app.score += 1\n        scoreLabel.value = 'Score: ' + str(app.score)"),
                tip('Check «coin.visible» so a coin is only collected once.')
              ]
            }
          ],
          exercises: [
            gx(
              'gm-2-1-e1',
              'Coin collector',
              "Arrow keys «'left'»/«'right'» move the player «20» pixels. When the player hits a visible coin, hide the coin, add 1 to «app.score», and set the label to «'Score: N'».",
              "app.score = 0\nscoreLabel = Label('Score: 0', 60, 20, size=16)\ncoins = [Circle(150, 200, 12, fill='gold'), Circle(250, 200, 12, fill='gold'), Circle(350, 200, 12, fill='gold')]\nplayer = Rect(40, 185, 30, 30, fill='royalBlue')\n\ndef onKeyPress(key):\n    pass\n",
              "app.score = 0\nscoreLabel = Label('Score: 0', 60, 20, size=16)\ncoins = [Circle(150, 200, 12, fill='gold'), Circle(250, 200, 12, fill='gold'), Circle(350, 200, 12, fill='gold')]\nplayer = Rect(40, 185, 30, 30, fill='royalBlue')\n\ndef onKeyPress(key):\n    if key == 'right':\n        player.centerX += 20\n    elif key == 'left':\n        player.centerX -= 20\n    for coin in coins:\n        if coin.visible and player.hitsShape(coin):\n            coin.visible = False\n            app.score += 1\n            scoreLabel.value = 'Score: ' + str(app.score)\n",
              {
                points: 3,
                tests: [
                  { label: 'Starts with three coins' },
                  { label: 'Reach the first coin', events: Array.from({ length: 5 }, () => key('right')) },
                  { label: 'Collect all three', events: Array.from({ length: 16 }, () => key('right')) },
                  { label: 'Walking back does not double count', events: [...Array.from({ length: 6 }, () => key('right')), ...Array.from({ length: 4 }, () => key('left'))] }
                ]
              }
            )
          ]
        },
        {
          id: 'gm-2-2',
          title: 'Pong',
          summary: 'Put it all together.',
          parts: [
            {
              title: 'Game loop',
              sections: [
                text('A game is a loop: every step, **move** things, **check collisions**, and **update the score or state**. Keep speeds like «app.dx» and «app.dy» on «app» so you can flip them on a bounce.'),
                example("ball = Circle(200, 100, 10, fill='white')\napp.background = 'black'\napp.dx = 4\napp.dy = 3\n\ndef onStep():\n    ball.centerX += app.dx\n    ball.centerY += app.dy\n    if ball.left <= 0 or ball.right >= 400:\n        app.dx = -app.dx\n    if ball.top <= 0 or ball.bottom >= 400:\n        app.dy = -app.dy")
              ]
            }
          ],
          exercises: [
            gx(
              'gm-2-2-e1',
              'Pong',
              "Finish Pong:\n1. «onMouseMove» sets the paddle's «centerX» to «mouseX».\n2. Every step, move the ball by «app.dx», «app.dy».\n3. Bounce off the left/right walls and the top (flip «app.dx» or «app.dy»).\n4. If the ball hits the paddle, make «app.dy» negative (it goes up).\n5. If the ball's «top» goes below «400», set the message to «'Game over'».",
              "app.background = 'black'\nball = Circle(200, 100, 10, fill='white')\npaddle = Rect(160, 360, 80, 12, fill='white')\nmessage = Label('', 200, 200, size=30, fill='white')\napp.dx = 4\napp.dy = 5\n\ndef onMouseMove(mouseX, mouseY):\n    pass\n\ndef onStep():\n    pass\n",
              "app.background = 'black'\nball = Circle(200, 100, 10, fill='white')\npaddle = Rect(160, 360, 80, 12, fill='white')\nmessage = Label('', 200, 200, size=30, fill='white')\napp.dx = 4\napp.dy = 5\n\ndef onMouseMove(mouseX, mouseY):\n    paddle.centerX = mouseX\n\ndef onStep():\n    ball.centerX += app.dx\n    ball.centerY += app.dy\n    if ball.left <= 0 or ball.right >= 400:\n        app.dx = -app.dx\n    if ball.top <= 0:\n        app.dy = -app.dy\n    if ball.hitsShape(paddle):\n        app.dy = -abs(app.dy)\n    if ball.top > 400:\n        message.value = 'Game over'\n",
              {
                points: 4,
                tests: [
                  { label: 'Ball moves', events: [steps(10)] },
                  { label: 'Paddle follows the mouse', events: [{ type: 'mouseMove', x: 80, y: 300 }] },
                  { label: 'Paddle bounces the ball back up', events: [{ type: 'mouseMove', x: 380, y: 300 }, steps(55), steps(10)] },
                  { label: 'Missing the ball ends the game', events: [{ type: 'mouseMove', x: 20, y: 300 }, steps(70)] }
                ]
              }
            )
          ]
        }
      ]
    }
  ]
}

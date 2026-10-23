import type { ApiDoc, Track } from '@shared/learn'
import { graphicsDocs } from './graphics-docs'
import { JS_BASICS_DOCS, LUA_BASICS_DOCS, PYTHON_BASICS_DOCS } from './basics-docs'
import { PYTHON_GRAPHICS } from './python-graphics'
import { PYTHON_BASICS } from './python-basics'
import { PYTHON_INTERMEDIATE, PYTHON_PROBLEMS, PY_MORE_DOCS } from './python-more'
import { PYTHON_GAMES, PY_GAMES_DOCS } from './python-games'
import { JS_BASICS, JS_GRAPHICS } from './javascript'
import { JS_INTERMEDIATE, JS_MORE_DOCS, LUA_INTERMEDIATE, LUA_MORE_DOCS } from './more-courses'
import { TS_BASICS, TS_DOCS } from './typescript'
import { SQL_BASICS, SQL_DOCS } from './sql'
import { LUA_BASICS } from './lua'

export const TRACKS: Track[] = [
  PYTHON_GRAPHICS,
  PYTHON_BASICS,
  PYTHON_GAMES,
  PYTHON_INTERMEDIATE,
  PYTHON_PROBLEMS,
  JS_BASICS,
  JS_GRAPHICS,
  JS_INTERMEDIATE,
  TS_BASICS,
  LUA_BASICS,
  LUA_INTERMEDIATE,
  SQL_BASICS
]

export const DOCS: Record<string, ApiDoc[]> = {
  'python-graphics': graphicsDocs('python'),
  'python-games': PY_GAMES_DOCS,
  'js-graphics': graphicsDocs('javascript'),
  'python-basics': PYTHON_BASICS_DOCS,
  'python-more': PY_MORE_DOCS,
  'js-basics': JS_BASICS_DOCS,
  'js-more': JS_MORE_DOCS,
  'ts-basics': TS_DOCS,
  'lua-basics': LUA_BASICS_DOCS,
  'lua-more': LUA_MORE_DOCS,
  'sql-basics': SQL_DOCS
}

/** CSS named colors (all accepted by the graphics runtimes), in a friendly camelCase spelling. */
export const COLOR_NAMES = `aliceBlue antiqueWhite aqua aquamarine azure beige bisque black blanchedAlmond blue blueViolet brown burlyWood cadetBlue
chartreuse chocolate coral cornflowerBlue cornsilk crimson cyan darkBlue darkCyan darkGoldenrod darkGray darkGreen darkKhaki darkMagenta
darkOliveGreen darkOrange darkOrchid darkRed darkSalmon darkSeaGreen darkSlateBlue darkSlateGray darkTurquoise darkViolet deepPink
deepSkyBlue dimGray dodgerBlue fireBrick floralWhite forestGreen fuchsia gainsboro ghostWhite gold goldenrod gray green greenYellow
honeydew hotPink indianRed indigo ivory khaki lavender lavenderBlush lawnGreen lemonChiffon lightBlue lightCoral lightCyan
lightGoldenrodYellow lightGray lightGreen lightPink lightSalmon lightSeaGreen lightSkyBlue lightSlateGray lightSteelBlue lightYellow lime
limeGreen linen magenta maroon mediumAquamarine mediumBlue mediumOrchid mediumPurple mediumSeaGreen mediumSlateBlue mediumSpringGreen
mediumTurquoise mediumVioletRed midnightBlue mintCream mistyRose moccasin navajoWhite navy oldLace olive oliveDrab orange orangeRed orchid
paleGoldenrod paleGreen paleTurquoise paleVioletRed papayaWhip peachPuff peru pink plum powderBlue purple rebeccaPurple red rosyBrown
royalBlue saddleBrown salmon sandyBrown seaGreen seashell sienna silver skyBlue slateBlue slateGray snow springGreen steelBlue tan teal
thistle tomato turquoise violet wheat white whiteSmoke yellow yellowGreen`.split(/\s+/)

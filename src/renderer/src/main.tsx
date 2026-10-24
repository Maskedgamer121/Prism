import { createRoot } from 'react-dom/client'
import './lib/monaco'
import './styles.css'
import './learn/learn.css'
import './learn/outline.css'
import { App } from './App'
import { registerAiComplete } from './lib/aiComplete'
import { registerLearnCompletions } from './learn/completions'
import { useApp } from './store'
import * as editorLib from './lib/editor'
const { openFile } = editorLib
import { sendMessage } from './lib/chat'
import * as actions from './lib/actions'
import { monaco } from './lib/monaco'
import { go, useLearn } from './learn/state'
import { DOCS, TRACKS } from './learn/content'
import * as review from './lib/review'

// Hooks for the dev screenshot harness only.
if (window.prism.automation) Object.assign(window, { __prism: { useApp, openFile, editor: editorLib, sendMessage, emit: actions.emit, actions, monaco, go, useLearn, TRACKS, DOCS, review } })

registerAiComplete()
registerLearnCompletions()

createRoot(document.getElementById('root')!).render(<App />)

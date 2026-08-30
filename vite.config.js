import { defineConfig } from 'vite'
import { transformAppV054 } from './scripts/v054-app-transform.js'
import { transformAppV055 } from './scripts/v055-app-transform.js'
import { transformAppV056 } from './scripts/v056-app-transform.js'
import { transformAppV057 } from './scripts/v057-app-transform.js'
import { transformAppV058 } from './scripts/v058-app-transform.js'
import { transformAppV0510 } from './scripts/v0510-app-transform.js'
import { transformAppV0511 } from './scripts/v0511-app-transform.js'
import { transformAppV0512 } from './scripts/v0512-app-transform.js'
import { transformAppV0513 } from './scripts/v0513-app-transform.js'
import { transformAppV0514 } from './scripts/v0514-app-transform.js'
import { transformAppV0515 } from './scripts/v0515-app-transform.js'
import { transformAppV0516 } from './scripts/v0516-app-transform.js'
import { transformAppV0517 } from './scripts/v0517-app-transform.js'
import { transformAppV0518 } from './scripts/v0518-app-transform.js'
import { transformAppV060 } from './scripts/v060-app-transform.js'
import { transformAppV070 } from './scripts/v070-app-transform.js'
import { transformAppV071 } from './scripts/v071-app-transform.js'
import { transformAppV080 } from './scripts/v080-app-transform.js'
import { transformAppV081 } from './scripts/v081-app-transform.js'
import { transformAppV090 } from './scripts/v090-app-transform.js'
import { transformAppV091 } from './scripts/v091-app-transform.js'
import { transformAppV092 } from './scripts/v092-app-transform.js'
import { transformAppV093 } from './scripts/v093-app-transform.js'
import { transformAppV094 } from './scripts/v094-app-transform.js'

export default defineConfig({
  base: '/debt-free/',
  plugins: [{
    name: 'debt-free-release-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/App.jsx')) return null
      return [transformAppV054,transformAppV055,transformAppV056,transformAppV057,transformAppV058,transformAppV0510,transformAppV0511,transformAppV0512,transformAppV0513,transformAppV0514,transformAppV0515,transformAppV0516,transformAppV0517,transformAppV0518,transformAppV060,transformAppV070,transformAppV071,transformAppV080,transformAppV081,transformAppV090,transformAppV091,transformAppV092,transformAppV093,transformAppV094].reduce((source,transform)=>transform(source),code)
    },
  }],
})

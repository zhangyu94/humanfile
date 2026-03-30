// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  pnpm: true,
  ignores: [
    'docs/**',
  ],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
  },
})

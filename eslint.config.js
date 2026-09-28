import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {ignores: ['dist']},
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                {allowConstantExport: true},
            ],
            "indent": ["error", 4],
            'brace-style': ['error', 'stroustrup'],
            '@typescript-eslint/strict-boolean-expressions': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['off', { args: 'none' }],
            'no-fallthrough': 'error',
            'object-curly-newline': ['error', {
                'ObjectExpression': { 'multiline': true, 'consistent': true },
                'ObjectPattern': { 'multiline': true, 'consistent': true },
                'ImportDeclaration': { 'multiline': true, 'consistent': true },
                'ExportDeclaration': { 'multiline': true, 'consistent': true }
            }]
        },
    },
)

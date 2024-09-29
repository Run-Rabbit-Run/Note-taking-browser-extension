import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
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
        { allowConstantExport: true },
      ],
        '@typescript-eslint/no-unused-vars': [
            "error",
            {
                "argsIgnorePattern": "^_",
                "destructuredArrayIgnorePattern": "^_",
                "ignoreRestSiblings": true,
                "caughtErrors": "all"
            }
        ],
        "@typescript-eslint/no-redeclare": "off",
        "no-shadow": "off",
        "no-unused-vars": "off",
        "no-underscore-dangle": "off",
        "max-len": [
            "error",
            {
                "code": 120,
                "ignoreUrls": true,
                "ignoreStrings": true,
                "ignoreTemplateLiterals": true,
                "ignoreRegExpLiterals": true,
                "ignoreComments": true
            }
        ],
        "no-case-declarations": "off",
        "no-console": "warn",
        "no-param-reassign": "off",
        "class-methods-use-this": "warn",
        "no-debugger": "error",
        "consistent-return": "warn",
        "no-nested-ternary": "warn",
        "@typescript-eslint/default-param-last": "warn",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-ts-ignore": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/naming-convention": "warn",
        "indent": ["error", 4],
        "semi": ["error", "always"],
    },
  },
)

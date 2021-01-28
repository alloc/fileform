import path from 'path'
import sade from 'sade'
import Enquirer from 'enquirer'
import { crawl } from 'recrawl-sync'
import { hb } from 'mini-hb'
import exec from '@cush/exec'
import degit from 'degit'
import log from 'lodge'
import fs from 'fs-extra'

const cli = sade('fileform [repo] [dest]', true)

cli.action(async (repo?: string, dest?: string) => {
  if (repo) {
    if (!dest) {
      const example = `${log.coal('fileform [repo]')} ${log.red('[dest]')}`
      throw fatal(`Must provide a destination\n\n    ${example}`)
    }
    try {
      await degit(repo, {}).clone(dest)
    } catch (e) {
      fatal('degit failed: ' + e.message)
    }
    process.chdir(dest)
  }

  const configPath = 'fileform.config.js'
  if (!fs.existsSync(configPath)) {
    fatal('Config must exist:', log.yellow(configPath))
  }

  const files = crawl(process.cwd(), {
    skip: [
      'node_modules',
      '.git',
      'yarn.lock',
      'pnpm-lock.yaml',
      'package-lock.json',
    ],
  })

  const { form, onForm, context = {} }: Config = require(path.resolve(
    configPath
  ))

  let values: any
  try {
    values = await resolveForm(form)
  } catch {
    process.exit(1)
  }

  const helpers: any = {
    camelize: (_body: string, _ctx: any, str: string) =>
      str.replace(/-([a-z])/g, match => match[1].toUpperCase()),
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/\{\{[\w ]+\}\}/.test(content)) {
      fs.writeFileSync(
        file,
        hb(
          content,
          new Proxy(values, {
            get(_, key: string) {
              if (key in values) {
                return values[key]
              }
              if (key in context) {
                return context[key]
              }
              if (key in helpers) {
                return helpers[key]
              }
              fatal('Missing variable:', log.yellow(key))
            },
          })
        )
      )
    }
  }

  if (onForm) {
    const context = {
      ...fs,
      prompt: Enquirer.prompt,
      exec: exec.sync,
      log,
    }
    await onForm.call(context, values)
  }

  fs.removeSync(configPath)

  exec.sync('git init')
})

cli.parse(process.argv)

type Config = {
  /** Descriptions of any form values */
  form: {
    [name: string]:
      | Function
      | [valType: Function, defaultVal?: any, message?: string]
  }
  /** Side effects after the form is filled */
  onForm?: (
    this: Context,
    values: { [name: string]: any }
  ) => Promise<void> | void
  /** Variables and functions for file templates */
  context?: { [key: string]: any }
}

type Context = typeof fs & {
  prompt: typeof Enquirer.prompt
  exec: typeof exec.sync
  log: typeof log
}

function fatal(...args: any[]) {
  console.error(log.red('[fatal]'), ...args)
  process.exit(1)
}

function toArray(arg: any): any[] {
  return Array.isArray(arg) ? arg : [arg]
}

async function resolveForm(form: Config['form']) {
  const values: any = {}
  for (const name in form) {
    const args = toArray(form[name]) as [Function, any, string]
    values[name] = await prompt(getQuestion(name, ...args))
  }
  return values
}

interface Prompt extends Enquirer.Prompt {
  result(value: any): any
}

function prompt(options: any) {
  const Prompt = (Enquirer as any).prompts[
    options.type
  ] as typeof Enquirer.Prompt
  const prompt = new Prompt(options) as Prompt
  if (options.multiline) {
    prompt.result = (value: string) => value.trim().split(/\s*\n\s*/)
  }
  return prompt.run()
}

function getQuestion(
  name: string,
  valType: Function,
  defaultVal?: unknown,
  message = ''
) {
  if (valType == Array) {
    if (Array.isArray(defaultVal))
      return {
        type: 'multiselect',
        name,
        message,
        choices: defaultVal,
      }
  } else if (valType == Boolean) {
    return {
      type: 'confirm',
      name,
      message,
      initial: defaultVal,
    }
  } else if (valType == String) {
    if (Array.isArray(defaultVal))
      return {
        type: 'select',
        name,
        message,
        choices: defaultVal,
      }
  } else {
    fatal(`"${name}" has invalid type:`, String(valType))
  }
  return {
    type: 'text',
    name,
    message,
    multiline: valType == Array,
    default: defaultVal,
  }
}

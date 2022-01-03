'use strict'

import fs from 'fs'
const configPath = process.env.CONFIG_PATH

function validateConfigs (configs) {
  const valid =
    Array.isArray(config) &&
    configs.every(config => config.url && config.name && config.path)

  if (!valid) throw new Error('invalid config')
}

function listConfigs () {
  if (fs.existsSync(configPath)) {
    return fs.readFileSync(configPath, 'utf-8')
  }
}

function saveConfigs (configs) {
  const unique = configs.reduce((p, c) => ({ ...p, ...c }))
  const merged = { ...Object.fromEntries(listConfigs()), ...unique }
  fs.writeFileSync(JSON.stringify(Object.entries(merged)))
}

/**
 * @param {{
 * models:import("../domain/model").Model,
 * data:import("../domain/datasource-factory").DataSourceFactory
 * }} options
 */
export default function editConfigsFactory ({ models } = {}) {
  return async function editConfigs (configs) {
    validateConfigs(configs)
    saveConfigs(configs)
    return {
      message: 'server config updated'
    }
  }
}

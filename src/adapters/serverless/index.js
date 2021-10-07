import { makeServerlessAdapter } from './serverless-adapter'
import * as localParsers from './parsers'

const getRemoteParsers = async () => import('aegis-services/parsers')

export const getParsers = async function () {
  try {
    const remoteParsers = await getRemoteParsers()
    if (!remoteParsers) return localParsers
    return { ...localParsers, ...remoteParsers }
  } catch (e) {
    console.error('serverless.parsers', e.message)
  }
  return localParsers
}

export const ServerlessAdapter = () => makeServerlessAdapter(getParsers)                             
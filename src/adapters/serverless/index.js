import { makeServerlessAdapter } from './serverless-adapter'
import * as parsers from './parsers'

export const ServerlessAdapter = makeServerlessAdapter(parsers)

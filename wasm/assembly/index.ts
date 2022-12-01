// The entry file of your WebAssembly module.

//import * as aegis from './aegis'
export function getModelName (): string {
  return 'wasm'
}
export function getEndpoint (): string {
  return 'wasm'
}
export function getDomain (): string {
  return 'wasm'
}

export const ArrayOfStrings_ID = idof<string[]>()

function findVal (key: string, kv: string[][]): string {
  for (let i = 0; i < kv.length; i++) {
    if (key === kv[i][0]) {
      return kv[i][1].toString()
    }
  }
  return ''
}

export function modelFactory (kv: string[][]): string[][] {
  const arr = new Array<string[]>(2)
  arr[0] = ['key1', findVal('key1', kv)]
  arr[1] = ['fibonacci', findVal('fibonacci', kv)]
  arr
  return arr
}

export function getPorts (): string[][] {
  const ports = new Array<string[]>(2)
  //service,type,consumesEvent,producesEvent,callback,undo
  ports[0] = ['runFibonacci', 'test,inbound,null,null,runFibonacci,1']
  ports[1] = ['emitEvent', 'test,outbound,null,null,emitEvent,1']
  return ports
}

export function emitEvent (kv: string[][]): string[][] {
  return [['status', 'ok']]
}

export function getCommands (): string[][] {
  const commands = new Array<string[]>(2)
  commands[0] = ['runFibonacci', 'remote calculate fibonacci']
  commands[1] = ['deployModule', 'request deployment of a module']
  return commands
}

function fibonacci (x: number): number {
  if (x === 0) {
    return 0
  }
  if (x === 1) {
    return 1
  }
  return fibonacci(x - 1) + fibonacci(x - 2)
}

export function runFibonacci (kv: string[][]): string[][] {
  let val: number = 0
  let startTime: i64 = Date.now()

  for (let i = 0; i < kv.length; i++) {
    if ('fibonacci' === kv[i][0]) {
      val = parseInt(kv[i][1])
      break
    }
  }
  const sum = fibonacci(val)
  const ret = new Array<string[]>(2)
  ret[0] = ['result', sum.toString()]
  ret[1] = ['time', (Date.now() - startTime).toString()]
  return ret
}

export function onUpdate (kv: string[][]): string[][] {
  return [['updatedByWasm', new Date(Date.now()).toISOString()]]
}

export function onDelete (kv: string[][]): i8 {
  // return negative to stop the action
  //aegis.log('onDelete called')
  return -1
}

export function validate (kv: string[][]): void {
  //aegis.log('onUpdate called')
  return
}

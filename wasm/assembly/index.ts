// The entry file of your WebAssembly modul

@external('env', 'console.log')
declare function consoleLog (s: string): void

export function getModelName (): string {
  return 'wasm'
}

export function getEndpoint (): string {
  return 'wasm'
}

export function getDomain (): string {
  return 'wasm'
}

export function update (changes: string[][]): void {
  const runValidation: boolean = true
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
  const arr = new Array<string[]>(4)
  arr[0] = ['wasm', 'AssemblyScript']
  arr[1] = ['fibonacci', findVal('fibonacci', kv) || '20']
  arr[2] = ['result', '0']
  arr[3] = ['time', '0']
  return arr
}

export function getPorts (): string[][] {
  const ports = new Array<string[]>(2)
  //port,service,type,consumesEvent,producesEvent,callback,undo
  ports[0] = [
    'runFibonacci',
    'fibonacciService,inbound,fibonacciBegin,fibonacciEnd,runFibonacci,'
  ]
  ports[1] = ['emitEvent', 'test,outbound,null,null,emitEvent,']
  return ports
}

export function emitEvent (kv: string[][]): string[][] {
  return [['status', 'ok']]
}

export function getCommands (): string[][] {
  const commands = new Array<string[]>(2)
  commands[0] = ['runFibonacci', 'fibonacci port']
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
  let fibonacciNumber: number = parseInt(findVal('fibonacci', kv))
  let startTime: i64 = Date.now()
  const sum = fibonacci(fibonacciNumber || 20)
  const rv = new Array<string[]>(3)
  rv[0] = ['fibonacci', fibonacciNumber.toString()]
  rv[1] = ['result', sum.toString()]
  rv[2] = ['time', (Date.now() - startTime).toString()]
  return rv
}

export function onUpdate (kv: string[][]): string[][] {
  return [['updatedByWasm', new Date(Date.now()).toISOString()]]
}

export function onDelete (kv: string[][]): string[][] {
  // return negative to stop the action
  //aegis.log('onDelete called')
  return [['status', 'ok']]
}

export function validate (kv: string[][]): string[][] {
  //aegis.log('onUpdate called')
  return [['status', 'ok']]
}

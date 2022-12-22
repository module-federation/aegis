export interface ActivationFunction {
  output(input: number): number;
  der(input: number): number;
}

export class Me implements ActivationFunction {
  output(input: number): number {
    throw new Error("Method not implemented." + input.toString());
  }
  public static outputStatic(input: number): number {
    throw new Error("Method not implemented." + input.toString());
  }
  der(input: number): number {
    throw new Error("Method not implemented." + input.toString());
  }
}

export function callMe(): Me {
  const me = new Me();
  me.der(2);
  me.output(3);
  return me;
}

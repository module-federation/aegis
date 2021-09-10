export declare function log(s: string): void;
export declare function addListener(
  eventName: string,
  callbackName: string
): void;
export declare function fireEvent(eventName: string, eventData: string): void;
export declare function invokeMethod(
  methodName: string,
  methodArgs: string
): string[][];
export declare function invokePort(
  portName: string,
  portData: string,
  portConsumerEvent: string,
  callbackName: string,
  undoName: string
): void;
export declare function getId(): string;

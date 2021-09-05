export declare function log(s: string):void
export declare function listen(eventName:string, callbackName:string):void
export declare function notify(eventName:string, eventData:string, fieldNames?:string[]):void
export declare function websocketListen(eventName:string, callbackName:string):void
export declare function websocketNotify(eventName:string, eventData:string):void
export declare function invokeMethod(methodName:string, methodArgs:string):void
export declare function invokePort(portName:string, portData:string, portConsumerEvent:string):void
export declare function getId():string

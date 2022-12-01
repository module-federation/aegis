(module
 (type $i32_i32_=>_i32 (func (param i32 i32) (result i32)))
 (type $i32_i32_=>_none (func (param i32 i32)))
 (type $i32_=>_none (func (param i32)))
 (type $i32_i32_i32_=>_none (func (param i32 i32 i32)))
 (type $none_=>_none (func))
 (type $none_=>_i32 (func (result i32)))
 (type $i32_i32_i32_=>_i32 (func (param i32 i32 i32) (result i32)))
 (type $i32_=>_i32 (func (param i32) (result i32)))
 (type $i32_i32_i32_i32_=>_none (func (param i32 i32 i32 i32)))
 (type $i32_i32_f64_=>_none (func (param i32 i32 f64)))
 (type $f64_=>_f64 (func (param f64) (result f64)))
 (type $none_=>_f64 (func (result f64)))
 (type $i32_=>_f64 (func (param i32) (result f64)))
 (type $i64_i64_i32_i64_i32_=>_i32 (func (param i64 i64 i32 i64 i32) (result i32)))
 (type $f64_=>_i32 (func (param f64) (result i32)))
 (type $i64_=>_i32 (func (param i64) (result i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (import "aegis" "log" (func $assembly/aegis/log (param i32)))
 (import "aegis" "addListener" (func $assembly/aegis/addListener (param i32 i32)))
 (import "aegis" "fireEvent" (func $assembly/aegis/fireEvent (param i32 i32 f64)))
 (import "env" "Date.now" (func $~lib/bindings/dom/Date.now (result f64)))
 (global $assembly/index/ArrayOfStrings_ID i32 (i32.const 4))
 (global $~lib/rt/itcms/white (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/iter (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/toSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/state (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/total (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/threshold (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/visitCount (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/pinSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/fromSpace (mut i32) (i32.const 0))
 (global $~lib/rt/tlsf/ROOT (mut i32) (i32.const 0))
 (global $~lib/util/number/_frc_plus (mut i64) (i64.const 0))
 (global $~lib/util/number/_frc_minus (mut i64) (i64.const 0))
 (global $~lib/util/number/_exp (mut i32) (i32.const 0))
 (global $~lib/util/number/_K (mut i32) (i32.const 0))
 (global $~lib/util/number/_frc_pow (mut i64) (i64.const 0))
 (global $~lib/util/number/_exp_pow (mut i32) (i32.const 0))
 (global $~lib/date/_day (mut i32) (i32.const 0))
 (global $~lib/date/_month (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 9408))
 (global $~lib/memory/__stack_pointer (mut i32) (i32.const 25876))
 (memory $0 1)
 (data (i32.const 1036) "<")
 (data (i32.const 1048) "\01\00\00\00 \00\00\00~\00l\00i\00b\00/\00r\00t\00/\00i\00t\00c\00m\00s\00.\00t\00s")
 (data (i32.const 1132) "<")
 (data (i32.const 1144) "\01\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data (i32.const 1196) ",")
 (data (i32.const 1208) "\01\00\00\00\14\00\00\00~\00l\00i\00b\00/\00r\00t\00.\00t\00s")
 (data (i32.const 1244) "<")
 (data (i32.const 1256) "\01\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data (i32.const 1372) "<")
 (data (i32.const 1384) "\01\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00t\00l\00s\00f\00.\00t\00s")
 (data (i32.const 1436) "\1c")
 (data (i32.const 1448) "\01\00\00\00\08\00\00\00w\00a\00s\00m")
 (data (i32.const 1468) ",")
 (data (i32.const 1480) "\01\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data (i32.const 1516) ",")
 (data (i32.const 1528) "\01\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s")
 (data (i32.const 1564) "\1c")
 (data (i32.const 1576) "\01\00\00\00\08\00\00\00k\00e\00y\001")
 (data (i32.const 1596) "|")
 (data (i32.const 1608) "\01\00\00\00^\00\00\00E\00l\00e\00m\00e\00n\00t\00 \00t\00y\00p\00e\00 \00m\00u\00s\00t\00 \00b\00e\00 \00n\00u\00l\00l\00a\00b\00l\00e\00 \00i\00f\00 \00a\00r\00r\00a\00y\00 \00i\00s\00 \00h\00o\00l\00e\00y")
 (data (i32.const 1724) "\1c")
 (data (i32.const 1736) "\01")
 (data (i32.const 1756) "\1c")
 (data (i32.const 1768) "\01\00\00\00\08\00\00\00k\00e\00y\002")
 (data (i32.const 1788) ",")
 (data (i32.const 1800) "\01\00\00\00\12\00\00\00f\00i\00b\00o\00n\00a\00c\00c\00i")
 (data (i32.const 1836) "\1c")
 (data (i32.const 1848) "\01\00\00\00\n\00\00\00p\00o\00r\00t\001")
 (data (i32.const 1868) "|")
 (data (i32.const 1880) "\01\00\00\00^\00\00\00d\00F\00l\00o\00w\00,\00o\00u\00t\00b\00o\00u\00n\00d\00,\00d\00F\00l\00o\00w\00_\00s\00t\00a\00r\00t\00,\00p\00o\00r\00t\001\00_\00d\00o\00n\00e\00,\00p\00o\00r\00t\001\00C\00b\00,\001")
 (data (i32.const 1996) "\1c")
 (data (i32.const 2012) "\08\00\00\00@\07\00\00`\07")
 (data (i32.const 2028) "\1c")
 (data (i32.const 2040) "\01\00\00\00\n\00\00\00p\00o\00r\00t\002")
 (data (i32.const 2060) "l")
 (data (i32.const 2072) "\01\00\00\00\\\00\00\00d\00F\00l\00o\00w\00,\00o\00u\00t\00b\00o\00u\00n\00d\00,\00p\00o\00r\00t\001\00_\00d\00o\00n\00e\00,\00p\00o\00r\00t\002\00_\00d\00o\00n\00e\00,\00p\00o\00r\00t\002\00C\00b\00,\001")
 (data (i32.const 2172) "\1c")
 (data (i32.const 2188) "\08\00\00\00\00\08\00\00 \08")
 (data (i32.const 2204) "\1c")
 (data (i32.const 2216) "\01\00\00\00\08\00\00\00p\00o\00r\00t")
 (data (i32.const 2236) "\1c")
 (data (i32.const 2252) "\08\00\00\00\b0\08\00\00@\07")
 (data (i32.const 2268) ",")
 (data (i32.const 2280) "\01\00\00\00\10\00\00\00c\00a\00l\00l\00b\00a\00c\00k")
 (data (i32.const 2316) ",")
 (data (i32.const 2328) "\01\00\00\00\0e\00\00\00p\00o\00r\00t\001\00C\00b")
 (data (i32.const 2364) "\1c")
 (data (i32.const 2380) "\08\00\00\00\f0\08\00\00 \t")
 (data (i32.const 2396) ",")
 (data (i32.const 2408) "\01\00\00\00\1a\00\00\00c\00o\00n\00s\00u\00m\00e\00s\00E\00v\00e\00n\00t")
 (data (i32.const 2444) ",")
 (data (i32.const 2456) "\01\00\00\00\16\00\00\00d\00F\00l\00o\00w\00_\00s\00t\00a\00r\00t")
 (data (i32.const 2492) "\1c")
 (data (i32.const 2508) "\08\00\00\00p\t\00\00\a0\t")
 (data (i32.const 2524) ",")
 (data (i32.const 2536) "\01\00\00\00\1a\00\00\00p\00r\00o\00d\00u\00c\00e\00s\00E\00v\00e\00n\00t")
 (data (i32.const 2572) ",")
 (data (i32.const 2584) "\01\00\00\00\14\00\00\00p\00o\00r\00t\001\00_\00d\00o\00n\00e")
 (data (i32.const 2620) "\1c")
 (data (i32.const 2636) "\08\00\00\00\f0\t\00\00 \n")
 (data (i32.const 2652) ",")
 (data (i32.const 2664) "\01\00\00\00\1a\00\00\00p\00o\00r\00f\00 \00i\00n\00v\00o\00k\00c\00e\00d")
 (data (i32.const 2700) "\1c")
 (data (i32.const 2712) "\01\00\00\00\02\00\00\00 ")
 (data (i32.const 2732) "\1c")
 (data (i32.const 2748) "\08\00\00\00\b0\08\00\00\00\08")
 (data (i32.const 2764) ",")
 (data (i32.const 2776) "\01\00\00\00\0e\00\00\00p\00o\00r\00t\002\00C\00b")
 (data (i32.const 2812) "\1c")
 (data (i32.const 2828) "\08\00\00\00\f0\08\00\00\e0\n")
 (data (i32.const 2844) "\1c")
 (data (i32.const 2860) "\08\00\00\00p\t\00\00 \n")
 (data (i32.const 2876) ",")
 (data (i32.const 2888) "\01\00\00\00\14\00\00\00p\00o\00r\00t\002\00_\00d\00o\00n\00e")
 (data (i32.const 2924) "\1c")
 (data (i32.const 2940) "\08\00\00\00\f0\t\00\00P\0b")
 (data (i32.const 2956) ",")
 (data (i32.const 2968) "\01\00\00\00\18\00\00\00p\00o\00r\00f\00 \00i\00n\00v\00o\00k\00e\00d")
 (data (i32.const 3004) "<")
 (data (i32.const 3016) "\01\00\00\00\"\00\00\00s\00e\00r\00v\00i\00c\00e\00M\00e\00s\00h\00L\00i\00s\00t\00e\00n")
 (data (i32.const 3068) "\\")
 (data (i32.const 3080) "\01\00\00\00F\00\00\00t\00e\00l\00l\00 \00w\00a\00s\00m\00 \00m\00o\00d\00u\00l\00e\00 \00t\00o\00 \00b\00e\00g\00i\00n\00 \00l\00i\00s\00t\00e\00n\00i\00n\00g")
 (data (i32.const 3164) "\1c")
 (data (i32.const 3180) "\08\00\00\00\d0\0b\00\00\10\0c")
 (data (i32.const 3196) "<")
 (data (i32.const 3208) "\01\00\00\00\"\00\00\00s\00e\00r\00v\00i\00c\00e\00M\00e\00s\00h\00N\00o\00t\00i\00f\00y")
 (data (i32.const 3260) "\\")
 (data (i32.const 3272) "\01\00\00\00D\00\00\00t\00e\00l\00l\00 \00w\00a\00s\00m\00 \00m\00o\00d\00u\00l\00e\00 \00t\00o\00 \00s\00e\00n\00d\00 \00b\00r\00o\00a\00d\00c\00a\00s\00t")
 (data (i32.const 3356) "\1c")
 (data (i32.const 3372) "\08\00\00\00\90\0c\00\00\d0\0c")
 (data (i32.const 3388) "<")
 (data (i32.const 3400) "\01\00\00\00&\00\00\00s\00e\00r\00v\00i\00c\00e\00M\00e\00s\00h\00C\00a\00l\00l\00b\00a\00c\00k")
 (data (i32.const 3452) "<")
 (data (i32.const 3464) "\01\00\00\00,\00\00\00s\00u\00b\00s\00c\00r\00i\00b\00e\00d\00 \00e\00v\00e\00n\00t\00 \00f\00i\00r\00e\00d")
 (data (i32.const 3516) "\1c")
 (data (i32.const 3532) "\08\00\00\00P\0d\00\00\90\0d")
 (data (i32.const 3548) ",")
 (data (i32.const 3560) "\01\00\00\00\18\00\00\00r\00u\00n\00F\00i\00b\00o\00n\00a\00c\00c\00i")
 (data (i32.const 3596) "L")
 (data (i32.const 3608) "\01\00\00\004\00\00\00r\00e\00m\00o\00t\00e\00 \00c\00a\00l\00c\00u\00l\00a\00t\00e\00 \00f\00i\00b\00o\00n\00a\00c\00c\00i")
 (data (i32.const 3676) "\1c")
 (data (i32.const 3692) "\08\00\00\00\f0\0d\00\00 \0e")
 (data (i32.const 3708) "\\")
 (data (i32.const 3720) "\01\00\00\00@\00\00\00c\00a\00l\00c\00u\00l\00a\00t\00e\00 \00f\00i\00b\00o\00n\00a\00c\00c\00i\00 \00f\00o\00r\00 \00a\00 \00n\00u\00m\00b\00e\00r")
 (data (i32.const 3804) "\1c")
 (data (i32.const 3820) "\08\00\00\00\10\07\00\00\90\0e")
 (data (i32.const 3836) ",")
 (data (i32.const 3848) "\01\00\00\00\18\00\00\00d\00e\00p\00l\00o\00y\00M\00o\00d\00u\00l\00e")
 (data (i32.const 3884) "L")
 (data (i32.const 3896) "\01\00\00\00<\00\00\00r\00e\00q\00u\00e\00s\00t\00 \00d\00e\00p\00l\00o\00y\00m\00e\00n\00t\00 \00o\00f\00 \00a\00 \00m\00o\00d\00u\00l\00e")
 (data (i32.const 3964) "\1c")
 (data (i32.const 3980) "\08\00\00\00\10\0f\00\00@\0f")
 (data (i32.const 3996) ",")
 (data (i32.const 4008) "\01\00\00\00\12\00\00\00c\00o\00m\00m\00a\00n\00d\00E\00x")
 (data (i32.const 4044) "<")
 (data (i32.const 4056) "\01\00\00\00\1e\00\00\00c\00o\00m\00m\00a\00n\00d\00 \00e\00x\00a\00m\00p\00l\00e")
 (data (i32.const 4108) "\1c")
 (data (i32.const 4124) "\08\00\00\00\b0\0f\00\00\e0\0f")
 (data (i32.const 4140) "<")
 (data (i32.const 4152) "\01\00\00\00$\00\00\00\n\00c\00o\00m\00m\00a\00n\00d\00E\00x\00 \00c\00a\00l\00l\00e\00d\00 ")
 (data (i32.const 4204) "\1c")
 (data (i32.const 4216) "\01\00\00\00\02\00\00\00:")
 (data (i32.const 4236) "<")
 (data (i32.const 4248) "\01\00\00\00\"\00\00\00c\00o\00m\00m\00a\00n\00d\00E\00x\00_\00u\00p\00d\00a\00t\00e\00!")
 (data (i32.const 4300) "\1c")
 (data (i32.const 4316) "\08\00\00\000\06\00\00\a0\10")
 (data (i32.const 4332) "<")
 (data (i32.const 4344) "\01\00\00\00&\00\00\00s\00e\00r\00v\00i\00c\00e\00M\00e\00s\00h\00L\00i\00s\00t\00e\00n\00:\00 ")
 (data (i32.const 4396) "\1c")
 (data (i32.const 4408) "\01\00\00\00\04\00\00\00:\00 ")
 (data (i32.const 4428) ",")
 (data (i32.const 4440) "\01\00\00\00\12\00\00\00e\00v\00e\00n\00t\00N\00a\00m\00e")
 (data (i32.const 4476) ",")
 (data (i32.const 4488) "\01\00\00\00\12\00\00\00m\00o\00d\00e\00l\00N\00a\00m\00e")
 (data (i32.const 4524) ",")
 (data (i32.const 4536) "\01\00\00\00\0e\00\00\00m\00o\00d\00e\00l\00I\00d")
 (data (i32.const 4572) "L")
 (data (i32.const 4584) "\01\00\00\00<\00\00\00w\00a\00s\00m\00 \00n\00o\00t\00i\00f\00y\00 \00c\00a\00l\00l\00e\00d\00 \00w\00i\00t\00h\00 \00a\00r\00g\00s\00:\00 ")
 (data (i32.const 4652) ",")
 (data (i32.const 4664) "\01\00\00\00\1a\00\00\00w\00a\00s\00m\00W\00e\00b\00L\00i\00s\00t\00e\00n")
 (data (i32.const 4700) "L")
 (data (i32.const 4712) "\01\00\00\004\00\00\00w\00e\00b\00s\00o\00c\00k\00e\00t\00 \00c\00a\00l\00l\00b\00a\00c\00k\00 \00f\00i\00r\00e\00d\00:\00 ")
 (data (i32.const 4780) "\1c")
 (data (i32.const 4796) "\08\00\00\000\06\00\00P\0d")
 (data (i32.const 4812) "\1c")
 (data (i32.const 4824) "\01\00\00\00\0c\00\00\00r\00e\00s\00u\00l\00t")
 (data (i32.const 4844) "\1c")
 (data (i32.const 4856) "\01\00\00\00\06\00\00\000\00.\000")
 (data (i32.const 4876) "\1c")
 (data (i32.const 4888) "\01\00\00\00\06\00\00\00N\00a\00N")
 (data (i32.const 4908) ",")
 (data (i32.const 4920) "\01\00\00\00\12\00\00\00-\00I\00n\00f\00i\00n\00i\00t\00y")
 (data (i32.const 4956) ",")
 (data (i32.const 4968) "\01\00\00\00\10\00\00\00I\00n\00f\00i\00n\00i\00t\00y")
 (data (i32.const 5064) "\88\02\1c\08\a0\d5\8f\fav\bf>\a2\7f\e1\ae\bav\acU0 \fb\16\8b\ea5\ce]J\89B\cf-;eU\aa\b0k\9a\dfE\1a=\03\cf\1a\e6\ca\c6\9a\c7\17\fep\abO\dc\bc\be\fc\b1w\ff\0c\d6kA\ef\91V\be<\fc\7f\90\ad\1f\d0\8d\83\9aU1(\\Q\d3\b5\c9\a6\ad\8f\acq\9d\cb\8b\ee#w\"\9c\eamSx@\91I\cc\aeW\ce\b6]y\12<\827V\fbM6\94\10\c2O\98H8o\ea\96\90\c7:\82%\cb\85t\d7\f4\97\bf\97\cd\cf\86\a0\e5\ac*\17\98\n4\ef\8e\b25*\fbg8\b2;?\c6\d2\df\d4\c8\84\ba\cd\d3\1a\'D\dd\c5\96\c9%\bb\ce\9fk\93\84\a5b}$l\ac\db\f6\da_\0dXf\ab\a3&\f1\c3\de\93\f8\e2\f3\b8\80\ff\aa\a8\ad\b5\b5\8bJ|l\05_b\87S0\c14`\ff\bc\c9U&\ba\91\8c\85N\96\bd~)p$w\f9\df\8f\b8\e5\b8\9f\bd\df\a6\94}t\88\cf_\a9\f8\cf\9b\a8\8f\93pD\b9k\15\0f\bf\f8\f0\08\8a\b611eU%\b0\cd\ac\7f{\d0\c6\e2?\99\06;+*\c4\10\\\e4\d3\92si\99$$\aa\0e\ca\00\83\f2\b5\87\fd\eb\1a\11\92d\08\e5\bc\cc\88Po\t\cc\bc\8c,e\19\e2X\17\b7\d1\00\00\00\00\00\00@\9c\00\00\00\00\10\a5\d4\e8\00\00b\ac\c5\ebx\ad\84\t\94\f8x9?\81\b3\15\07\c9{\ce\97\c0p\\\ea{\ce2~\8fh\80\e9\ab\a48\d2\d5E\"\9a\17&\'O\9f\'\fb\c4\d41\a2c\ed\a8\ad\c8\8c8e\de\b0\dbe\ab\1a\8e\08\c7\83\9a\1dqB\f9\1d]\c4X\e7\1b\a6,iM\92\ea\8dp\1ad\ee\01\daJw\ef\9a\99\a3m\a2\85k}\b4{x\t\f2w\18\ddy\a1\e4T\b4\c2\c5\9b[\92\86[\86=]\96\c8\c5S5\c8\b3\a0\97\fa\\\b4*\95\e3_\a0\99\bd\9fF\de%\8c9\db4\c2\9b\a5\\\9f\98\a3r\9a\c6\f6\ce\be\e9TS\bf\dc\b7\e2A\"\f2\17\f3\fc\88\a5x\\\d3\9b\ce \cc\dfS!{\f3Z\16\98:0\1f\97\dc\b5\a0\e2\96\b3\e3\\S\d1\d9\a8<D\a7\a4\d9|\9b\fb\10D\a4\a7LLv\bb\1a\9c@\b6\ef\8e\ab\8b,\84W\a6\10\ef\1f\d0)1\91\e9\e5\a4\10\9b\9d\0c\9c\a1\fb\9b\10\e7)\f4;b\d9 (\ac\85\cf\a7z^KD\80-\dd\ac\03@\e4!\bf\8f\ffD^/\9cg\8eA\b8\8c\9c\9d\173\d4\a9\1b\e3\b4\92\db\19\9e\d9w\df\ban\bf\96\ebk\ee\f0\9b;\02\87\af")
 (data (i32.const 5760) "<\fbW\fbr\fb\8c\fb\a7\fb\c1\fb\dc\fb\f6\fb\11\fc,\fcF\fca\fc{\fc\96\fc\b1\fc\cb\fc\e6\fc\00\fd\1b\fd5\fdP\fdk\fd\85\fd\a0\fd\ba\fd\d5\fd\ef\fd\n\fe%\fe?\feZ\fet\fe\8f\fe\a9\fe\c4\fe\df\fe\f9\fe\14\ff.\ffI\ffc\ff~\ff\99\ff\b3\ff\ce\ff\e8\ff\03\00\1e\008\00S\00m\00\88\00\a2\00\bd\00\d8\00\f2\00\0d\01\'\01B\01\\\01w\01\92\01\ac\01\c7\01\e1\01\fc\01\16\021\02L\02f\02\81\02\9b\02\b6\02\d0\02\eb\02\06\03 \03;\03U\03p\03\8b\03\a5\03\c0\03\da\03\f5\03\0f\04*\04")
 (data (i32.const 5936) "\01\00\00\00\n\00\00\00d\00\00\00\e8\03\00\00\10\'\00\00\a0\86\01\00@B\0f\00\80\96\98\00\00\e1\f5\05\00\ca\9a;")
 (data (i32.const 5976) "0\000\000\001\000\002\000\003\000\004\000\005\000\006\000\007\000\008\000\009\001\000\001\001\001\002\001\003\001\004\001\005\001\006\001\007\001\008\001\009\002\000\002\001\002\002\002\003\002\004\002\005\002\006\002\007\002\008\002\009\003\000\003\001\003\002\003\003\003\004\003\005\003\006\003\007\003\008\003\009\004\000\004\001\004\002\004\003\004\004\004\005\004\006\004\007\004\008\004\009\005\000\005\001\005\002\005\003\005\004\005\005\005\006\005\007\005\008\005\009\006\000\006\001\006\002\006\003\006\004\006\005\006\006\006\007\006\008\006\009\007\000\007\001\007\002\007\003\007\004\007\005\007\006\007\007\007\008\007\009\008\000\008\001\008\002\008\003\008\004\008\005\008\006\008\007\008\008\008\009\009\000\009\001\009\002\009\003\009\004\009\005\009\006\009\007\009\008\009\009")
 (data (i32.const 6380) "\1c")
 (data (i32.const 6392) "\01\00\00\00\08\00\00\00t\00i\00m\00e")
 (data (i32.const 6412) "|")
 (data (i32.const 6424) "\01\00\00\00d\00\00\00t\00o\00S\00t\00r\00i\00n\00g\00(\00)\00 \00r\00a\00d\00i\00x\00 \00a\00r\00g\00u\00m\00e\00n\00t\00 \00m\00u\00s\00t\00 \00b\00e\00 \00b\00e\00t\00w\00e\00e\00n\00 \002\00 \00a\00n\00d\00 \003\006")
 (data (i32.const 6540) "<")
 (data (i32.const 6552) "\01\00\00\00&\00\00\00~\00l\00i\00b\00/\00u\00t\00i\00l\00/\00n\00u\00m\00b\00e\00r\00.\00t\00s")
 (data (i32.const 6604) "\1c")
 (data (i32.const 6616) "\01\00\00\00\02\00\00\000")
 (data (i32.const 6636) "\1c\04")
 (data (i32.const 6648) "\01\00\00\00\00\04\00\000\000\000\001\000\002\000\003\000\004\000\005\000\006\000\007\000\008\000\009\000\00a\000\00b\000\00c\000\00d\000\00e\000\00f\001\000\001\001\001\002\001\003\001\004\001\005\001\006\001\007\001\008\001\009\001\00a\001\00b\001\00c\001\00d\001\00e\001\00f\002\000\002\001\002\002\002\003\002\004\002\005\002\006\002\007\002\008\002\009\002\00a\002\00b\002\00c\002\00d\002\00e\002\00f\003\000\003\001\003\002\003\003\003\004\003\005\003\006\003\007\003\008\003\009\003\00a\003\00b\003\00c\003\00d\003\00e\003\00f\004\000\004\001\004\002\004\003\004\004\004\005\004\006\004\007\004\008\004\009\004\00a\004\00b\004\00c\004\00d\004\00e\004\00f\005\000\005\001\005\002\005\003\005\004\005\005\005\006\005\007\005\008\005\009\005\00a\005\00b\005\00c\005\00d\005\00e\005\00f\006\000\006\001\006\002\006\003\006\004\006\005\006\006\006\007\006\008\006\009\006\00a\006\00b\006\00c\006\00d\006\00e\006\00f\007\000\007\001\007\002\007\003\007\004\007\005\007\006\007\007\007\008\007\009\007\00a\007\00b\007\00c\007\00d\007\00e\007\00f\008\000\008\001\008\002\008\003\008\004\008\005\008\006\008\007\008\008\008\009\008\00a\008\00b\008\00c\008\00d\008\00e\008\00f\009\000\009\001\009\002\009\003\009\004\009\005\009\006\009\007\009\008\009\009\009\00a\009\00b\009\00c\009\00d\009\00e\009\00f\00a\000\00a\001\00a\002\00a\003\00a\004\00a\005\00a\006\00a\007\00a\008\00a\009\00a\00a\00a\00b\00a\00c\00a\00d\00a\00e\00a\00f\00b\000\00b\001\00b\002\00b\003\00b\004\00b\005\00b\006\00b\007\00b\008\00b\009\00b\00a\00b\00b\00b\00c\00b\00d\00b\00e\00b\00f\00c\000\00c\001\00c\002\00c\003\00c\004\00c\005\00c\006\00c\007\00c\008\00c\009\00c\00a\00c\00b\00c\00c\00c\00d\00c\00e\00c\00f\00d\000\00d\001\00d\002\00d\003\00d\004\00d\005\00d\006\00d\007\00d\008\00d\009\00d\00a\00d\00b\00d\00c\00d\00d\00d\00e\00d\00f\00e\000\00e\001\00e\002\00e\003\00e\004\00e\005\00e\006\00e\007\00e\008\00e\009\00e\00a\00e\00b\00e\00c\00e\00d\00e\00e\00e\00f\00f\000\00f\001\00f\002\00f\003\00f\004\00f\005\00f\006\00f\007\00f\008\00f\009\00f\00a\00f\00b\00f\00c\00f\00d\00f\00e\00f\00f")
 (data (i32.const 7692) "\\")
 (data (i32.const 7704) "\01\00\00\00H\00\00\000\001\002\003\004\005\006\007\008\009\00a\00b\00c\00d\00e\00f\00g\00h\00i\00j\00k\00l\00m\00n\00o\00p\00q\00r\00s\00t\00u\00v\00w\00x\00y\00z")
 (data (i32.const 7788) "\\")
 (data (i32.const 7800) "\01\00\00\00@\00\00\00p\00o\00r\00t\00E\00x\00 \00c\00a\00l\00l\00i\00n\00g\00 \00p\00o\00r\00t\00 \00w\00a\00s\00m\00T\00e\00s\00t\00P\00o\00r\00t")
 (data (i32.const 7884) ",")
 (data (i32.const 7896) "\01\00\00\00\1a\00\00\00u\00p\00d\00a\00t\00e\00d\00B\00y\00W\00a\00s\00m")
 (data (i32.const 7932) ",")
 (data (i32.const 7944) "\01\00\00\00\18\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00D\00a\00t\00e")
 (data (i32.const 7980) ",")
 (data (i32.const 7992) "\01\00\00\00\18\00\00\00~\00l\00i\00b\00/\00d\00a\00t\00e\00.\00t\00s")
 (data (i32.const 8028) "\1c")
 (data (i32.const 8040) "\01\00\00\00\n\00\00\00S\00u\00n\00,\00 ")
 (data (i32.const 8060) "\1c")
 (data (i32.const 8072) "\01\00\00\00\n\00\00\00M\00o\00n\00,\00 ")
 (data (i32.const 8092) "\1c")
 (data (i32.const 8104) "\01\00\00\00\n\00\00\00T\00u\00e\00,\00 ")
 (data (i32.const 8124) "\1c")
 (data (i32.const 8136) "\01\00\00\00\n\00\00\00W\00e\00d\00,\00 ")
 (data (i32.const 8156) "\1c")
 (data (i32.const 8168) "\01\00\00\00\n\00\00\00T\00h\00u\00,\00 ")
 (data (i32.const 8188) "\1c")
 (data (i32.const 8200) "\01\00\00\00\n\00\00\00F\00r\00i\00,\00 ")
 (data (i32.const 8220) "\1c")
 (data (i32.const 8232) "\01\00\00\00\n\00\00\00S\00a\00t\00,\00 ")
 (data (i32.const 8252) ",")
 (data (i32.const 8264) "\t\00\00\00\1c\00\00\00p\1f\00\00\90\1f\00\00\b0\1f\00\00\d0\1f\00\00\f0\1f\00\00\10 \00\000 ")
 (data (i32.const 8300) "\1c")
 (data (i32.const 8312) "\01\00\00\00\n\00\00\00 \00J\00a\00n\00 ")
 (data (i32.const 8332) "\1c")
 (data (i32.const 8344) "\01\00\00\00\n\00\00\00 \00F\00e\00b\00 ")
 (data (i32.const 8364) "\1c")
 (data (i32.const 8376) "\01\00\00\00\n\00\00\00 \00M\00a\00r\00 ")
 (data (i32.const 8396) "\1c")
 (data (i32.const 8408) "\01\00\00\00\n\00\00\00 \00A\00p\00r\00 ")
 (data (i32.const 8428) "\1c")
 (data (i32.const 8440) "\01\00\00\00\n\00\00\00 \00M\00a\00y\00 ")
 (data (i32.const 8460) "\1c")
 (data (i32.const 8472) "\01\00\00\00\n\00\00\00 \00J\00u\00n\00 ")
 (data (i32.const 8492) "\1c")
 (data (i32.const 8504) "\01\00\00\00\n\00\00\00 \00J\00u\00l\00 ")
 (data (i32.const 8524) "\1c")
 (data (i32.const 8536) "\01\00\00\00\n\00\00\00 \00A\00u\00g\00 ")
 (data (i32.const 8556) "\1c")
 (data (i32.const 8568) "\01\00\00\00\n\00\00\00 \00S\00e\00p\00 ")
 (data (i32.const 8588) "\1c")
 (data (i32.const 8600) "\01\00\00\00\n\00\00\00 \00O\00c\00t\00 ")
 (data (i32.const 8620) "\1c")
 (data (i32.const 8632) "\01\00\00\00\n\00\00\00 \00N\00o\00v\00 ")
 (data (i32.const 8652) "\1c")
 (data (i32.const 8664) "\01\00\00\00\n\00\00\00 \00D\00e\00c\00 ")
 (data (i32.const 8684) "L")
 (data (i32.const 8696) "\t\00\00\000\00\00\00\80 \00\00\a0 \00\00\c0 \00\00\e0 \00\00\00!\00\00 !\00\00@!\00\00`!\00\00\80!\00\00\a0!\00\00\c0!\00\00\e0!")
 (data (i32.const 8765) "\03\02\05\00\03\05\01\04\06\02\04")
 (data (i32.const 8780) "\1c")
 (data (i32.const 8792) "\01\00\00\00\08\00\00\00 \00G\00M\00T")
 (data (i32.const 8812) "L\00\00\00\03\00\00\00\00\00\00\00\t\00\00\000")
 (data (i32.const 8852) "\a0\n\00\00\00\00\00\00\80\10\00\00\00\00\00\00\80\10\00\00\00\00\00\00`\"")
 (data (i32.const 8892) "\1c")
 (data (i32.const 8904) "\01\00\00\00\02\00\00\00-")
 (data (i32.const 8924) "<")
 (data (i32.const 8936) "\01\00\00\00\1e\00\00\00o\00n\00D\00e\00l\00e\00t\00e\00 \00c\00a\00l\00l\00e\00d")
 (data (i32.const 8988) "<")
 (data (i32.const 9000) "\01\00\00\00\1e\00\00\00o\00n\00U\00p\00d\00a\00t\00e\00 \00c\00a\00l\00l\00e\00d")
 (data (i32.const 9052) ",")
 (data (i32.const 9064) "\01\00\00\00\0e\00\00\00d\00e\00f\00a\00u\00l\00t")
 (data (i32.const 9100) "\1c")
 (data (i32.const 9112) "\01\00\00\00\08\00\00\00k\00e\00y\003")
 (data (i32.const 9132) "<")
 (data (i32.const 9144) "\01\00\00\00\1e\00\00\00a\00l\00w\00a\00y\00s\00T\00h\00i\00s\00V\00a\00l\00u\00e")
 (data (i32.const 9196) "\1c")
 (data (i32.const 9212) "\08\00\00\00\a0#\00\00\c0#")
 (data (i32.const 9228) ",")
 (data (i32.const 9240) "\01\00\00\00\16\00\00\00t\00e\00s\00t\00 \00c\00a\00l\00l\00e\00d")
 (data (i32.const 9276) "<")
 (data (i32.const 9288) "\01\00\00\00*\00\00\00O\00b\00j\00e\00c\00t\00 \00a\00l\00r\00e\00a\00d\00y\00 \00p\00i\00n\00n\00e\00d")
 (data (i32.const 9340) "<")
 (data (i32.const 9352) "\01\00\00\00(\00\00\00O\00b\00j\00e\00c\00t\00 \00i\00s\00 \00n\00o\00t\00 \00p\00i\00n\00n\00e\00d")
 (data (i32.const 9408) "\n\00\00\00 \00\00\00\00\00\00\00 ")
 (data (i32.const 9436) " \00\00\00\00\00\00\00\02A")
 (data (i32.const 9460) "\02A\00\00\00\00\00\00\02\t\00\00\00\00\00\00 \00\00\00\00\00\00\00\04A")
 (export "getModelSpec" (func $assembly/index/getModelSpec))
 (export "ArrayOfStrings_ID" (global $assembly/index/ArrayOfStrings_ID))
 (export "getCommands" (func $assembly/index/getCommands))
 (export "fibonacci" (func $assembly/index/fibonacci))
 (export "__new" (func $~lib/rt/itcms/__new))
 (export "__pin" (func $~lib/rt/itcms/__pin))
 (export "__unpin" (func $~lib/rt/itcms/__unpin))
 (export "__collect" (func $~lib/rt/itcms/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "modelFactory" (func $export:assembly/index/modelFactory))
 (export "getPorts" (func $export:assembly/index/getPorts))
 (export "port1Cb" (func $export:assembly/index/port1Cb))
 (export "port2Cb" (func $export:assembly/index/port2Cb))
 (export "commandEx" (func $export:assembly/index/commandEx))
 (export "serviceMeshListen" (func $export:assembly/index/serviceMeshListen))
 (export "serviceMeshNotify" (func $export:assembly/index/serviceMeshNotify))
 (export "serviceMeshCallback" (func $export:assembly/index/serviceMeshCallback))
 (export "runFibonacci" (func $export:assembly/index/runFibonacci))
 (export "portEx" (func $export:assembly/index/portEx))
 (export "onUpdate" (func $export:assembly/index/onUpdate))
 (export "onDelete" (func $export:assembly/index/onDelete))
 (export "validate" (func $export:assembly/index/validate))
 (export "test" (func $export:assembly/index/test))
 (start $~start)
 (func $~lib/rt/itcms/Object#unlink (param $0 i32)
  (local $1 i32)
  local.get $0
  i32.load offset=4
  i32.const -4
  i32.and
  local.tee $1
  i32.eqz
  if
   i32.const 0
   local.get $0
   i32.const 25876
   i32.lt_u
   local.get $0
   i32.load offset=8
   select
   i32.eqz
   if
    i32.const 0
    i32.const 1056
    i32.const 127
    i32.const 18
    call $~lib/builtins/abort
    unreachable
   end
   return
  end
  local.get $0
  i32.load offset=8
  local.tee $0
  i32.eqz
  if
   i32.const 0
   i32.const 1056
   i32.const 131
   i32.const 16
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $1
  local.get $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
 )
 (func $~lib/rt/itcms/Object#makeGray (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  global.get $~lib/rt/itcms/iter
  i32.eq
  if
   local.get $0
   i32.load offset=8
   local.tee $1
   i32.eqz
   if
    i32.const 0
    i32.const 1056
    i32.const 147
    i32.const 30
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   global.set $~lib/rt/itcms/iter
  end
  local.get $0
  call $~lib/rt/itcms/Object#unlink
  global.get $~lib/rt/itcms/toSpace
  local.set $1
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 1
  i32.le_u
  if (result i32)
   i32.const 1
  else
   local.get $2
   i32.const 9408
   i32.load
   i32.gt_u
   if
    i32.const 1152
    i32.const 1216
    i32.const 22
    i32.const 28
    call $~lib/builtins/abort
    unreachable
   end
   local.get $2
   i32.const 3
   i32.shl
   i32.const 9412
   i32.add
   i32.load
   i32.const 32
   i32.and
  end
  local.set $3
  local.get $1
  i32.load offset=8
  local.set $2
  local.get $0
  global.get $~lib/rt/itcms/white
  i32.eqz
  i32.const 2
  local.get $3
  select
  local.get $1
  i32.or
  i32.store offset=4
  local.get $0
  local.get $2
  i32.store offset=8
  local.get $2
  local.get $0
  local.get $2
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
  local.get $1
  local.get $0
  i32.store offset=8
 )
 (func $~lib/rt/itcms/visitRoots
  (local $0 i32)
  (local $1 i32)
  i32.const 1152
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 1488
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 1616
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 1264
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 9296
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 9360
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 7952
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 6656
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  i32.const 7712
  call $byn-split-outlined-A$~lib/rt/itcms/__visit
  global.get $~lib/rt/itcms/pinSpace
  local.tee $1
  i32.load offset=4
  i32.const -4
  i32.and
  local.set $0
  loop $while-continue|0
   local.get $0
   local.get $1
   i32.ne
   if
    local.get $0
    i32.load offset=4
    i32.const 3
    i32.and
    i32.const 3
    i32.ne
    if
     i32.const 0
     i32.const 1056
     i32.const 159
     i32.const 16
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    i32.const 20
    i32.add
    call $~lib/rt/__visit_members
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    br $while-continue|0
   end
  end
 )
 (func $~lib/rt/tlsf/removeBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  i32.load
  local.tee $2
  i32.const 1
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 268
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $2
  i32.const -4
  i32.and
  local.tee $2
  i32.const 12
  i32.lt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 270
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $2
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $2
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   local.get $2
   i32.const 1073741820
   local.get $2
   i32.const 1073741820
   i32.lt_u
   select
   local.tee $2
   i32.clz
   i32.sub
   local.tee $4
   i32.const 7
   i32.sub
   local.set $3
   local.get $2
   local.get $4
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $2
  i32.const 16
  i32.lt_u
  local.get $3
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 284
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.load offset=8
  local.set $5
  local.get $1
  i32.load offset=4
  local.tee $4
  if
   local.get $4
   local.get $5
   i32.store offset=8
  end
  local.get $5
  if
   local.get $5
   local.get $4
   i32.store offset=4
  end
  local.get $1
  local.get $0
  local.get $3
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=96
  i32.eq
  if
   local.get $0
   local.get $3
   i32.const 4
   i32.shl
   local.get $2
   i32.add
   i32.const 2
   i32.shl
   i32.add
   local.get $5
   i32.store offset=96
   local.get $5
   i32.eqz
   if
    local.get $0
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    local.tee $1
    i32.load offset=4
    i32.const -2
    local.get $2
    i32.rotl
    i32.and
    local.set $2
    local.get $1
    local.get $2
    i32.store offset=4
    local.get $2
    i32.eqz
    if
     local.get $0
     local.get $0
     i32.load
     i32.const -2
     local.get $3
     i32.rotl
     i32.and
     i32.store
    end
   end
  end
 )
 (func $~lib/rt/tlsf/insertBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 201
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.load
  local.tee $3
  i32.const 1
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 203
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.const 4
  i32.add
  local.get $1
  i32.load
  i32.const -4
  i32.and
  i32.add
  local.tee $4
  i32.load
  local.tee $2
  i32.const 1
  i32.and
  if
   local.get $0
   local.get $4
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $3
   i32.const 4
   i32.add
   local.get $2
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
   local.get $1
   i32.const 4
   i32.add
   local.get $1
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $4
   i32.load
   local.set $2
  end
  local.get $3
  i32.const 2
  i32.and
  if
   local.get $1
   i32.const 4
   i32.sub
   i32.load
   local.tee $1
   i32.load
   local.tee $6
   i32.const 1
   i32.and
   i32.eqz
   if
    i32.const 0
    i32.const 1392
    i32.const 221
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   local.get $1
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $6
   i32.const 4
   i32.add
   local.get $3
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
  end
  local.get $4
  local.get $2
  i32.const 2
  i32.or
  i32.store
  local.get $3
  i32.const -4
  i32.and
  local.tee $2
  i32.const 12
  i32.lt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 233
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  local.get $1
  i32.const 4
  i32.add
  local.get $2
  i32.add
  i32.ne
  if
   i32.const 0
   i32.const 1392
   i32.const 234
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  i32.const 4
  i32.sub
  local.get $1
  i32.store
  local.get $2
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $2
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   local.get $2
   i32.const 1073741820
   local.get $2
   i32.const 1073741820
   i32.lt_u
   select
   local.tee $2
   i32.clz
   i32.sub
   local.tee $3
   i32.const 7
   i32.sub
   local.set $5
   local.get $2
   local.get $3
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $2
  i32.const 16
  i32.lt_u
  local.get $5
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 251
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $5
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=96
  local.set $3
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  local.get $3
  i32.store offset=8
  local.get $3
  if
   local.get $3
   local.get $1
   i32.store offset=4
  end
  local.get $0
  local.get $5
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store offset=96
  local.get $0
  local.get $0
  i32.load
  i32.const 1
  local.get $5
  i32.shl
  i32.or
  i32.store
  local.get $0
  local.get $5
  i32.const 2
  i32.shl
  i32.add
  local.tee $0
  local.get $0
  i32.load offset=4
  i32.const 1
  local.get $2
  i32.shl
  i32.or
  i32.store offset=4
 )
 (func $~lib/rt/tlsf/addMemory (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $1
  local.get $2
  i32.gt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 377
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.set $1
  local.get $0
  i32.load offset=1568
  local.tee $4
  if
   local.get $4
   i32.const 4
   i32.add
   local.get $1
   i32.gt_u
   if
    i32.const 0
    i32.const 1392
    i32.const 384
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   i32.const 16
   i32.sub
   local.get $4
   i32.eq
   if
    local.get $4
    i32.load
    local.set $3
    local.get $1
    i32.const 16
    i32.sub
    local.set $1
   end
  else
   local.get $0
   i32.const 1572
   i32.add
   local.get $1
   i32.gt_u
   if
    i32.const 0
    i32.const 1392
    i32.const 397
    i32.const 5
    call $~lib/builtins/abort
    unreachable
   end
  end
  local.get $2
  i32.const -16
  i32.and
  local.get $1
  i32.sub
  local.tee $2
  i32.const 20
  i32.lt_u
  if
   return
  end
  local.get $1
  local.get $3
  i32.const 2
  i32.and
  local.get $2
  i32.const 8
  i32.sub
  local.tee $2
  i32.const 1
  i32.or
  i32.or
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 4
  i32.add
  local.get $2
  i32.add
  local.tee $2
  i32.const 2
  i32.store
  local.get $0
  local.get $2
  i32.store offset=1568
  local.get $0
  local.get $1
  call $~lib/rt/tlsf/insertBlock
 )
 (func $~lib/rt/tlsf/initialize
  (local $0 i32)
  (local $1 i32)
  memory.size
  local.tee $1
  i32.const 0
  i32.le_s
  if (result i32)
   i32.const 1
   local.get $1
   i32.sub
   memory.grow
   i32.const 0
   i32.lt_s
  else
   i32.const 0
  end
  if
   unreachable
  end
  i32.const 25888
  i32.const 0
  i32.store
  i32.const 27456
  i32.const 0
  i32.store
  loop $for-loop|0
   local.get $0
   i32.const 23
   i32.lt_u
   if
    local.get $0
    i32.const 2
    i32.shl
    i32.const 25888
    i32.add
    i32.const 0
    i32.store offset=4
    i32.const 0
    local.set $1
    loop $for-loop|1
     local.get $1
     i32.const 16
     i32.lt_u
     if
      local.get $0
      i32.const 4
      i32.shl
      local.get $1
      i32.add
      i32.const 2
      i32.shl
      i32.const 25888
      i32.add
      i32.const 0
      i32.store offset=96
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|1
     end
    end
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|0
   end
  end
  i32.const 25888
  i32.const 27460
  memory.size
  i32.const 16
  i32.shl
  call $~lib/rt/tlsf/addMemory
  i32.const 25888
  global.set $~lib/rt/tlsf/ROOT
 )
 (func $~lib/rt/itcms/step (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  block $break|0
   block $case2|0
    block $case1|0
     block $case0|0
      global.get $~lib/rt/itcms/state
      br_table $case0|0 $case1|0 $case2|0 $break|0
     end
     i32.const 1
     global.set $~lib/rt/itcms/state
     i32.const 0
     global.set $~lib/rt/itcms/visitCount
     call $~lib/rt/itcms/visitRoots
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/iter
     global.get $~lib/rt/itcms/visitCount
     return
    end
    global.get $~lib/rt/itcms/white
    i32.eqz
    local.set $1
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    loop $while-continue|1
     local.get $0
     global.get $~lib/rt/itcms/toSpace
     i32.ne
     if
      local.get $0
      global.set $~lib/rt/itcms/iter
      local.get $1
      local.get $0
      i32.load offset=4
      i32.const 3
      i32.and
      i32.ne
      if
       local.get $0
       local.get $0
       i32.load offset=4
       i32.const -4
       i32.and
       local.get $1
       i32.or
       i32.store offset=4
       i32.const 0
       global.set $~lib/rt/itcms/visitCount
       local.get $0
       i32.const 20
       i32.add
       call $~lib/rt/__visit_members
       global.get $~lib/rt/itcms/visitCount
       return
      end
      local.get $0
      i32.load offset=4
      i32.const -4
      i32.and
      local.set $0
      br $while-continue|1
     end
    end
    i32.const 0
    global.set $~lib/rt/itcms/visitCount
    call $~lib/rt/itcms/visitRoots
    global.get $~lib/rt/itcms/toSpace
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    i32.eq
    if
     global.get $~lib/memory/__stack_pointer
     local.set $0
     loop $while-continue|0
      local.get $0
      i32.const 25876
      i32.lt_u
      if
       local.get $0
       i32.load
       local.tee $2
       if
        local.get $2
        call $byn-split-outlined-A$~lib/rt/itcms/__visit
       end
       local.get $0
       i32.const 4
       i32.add
       local.set $0
       br $while-continue|0
      end
     end
     global.get $~lib/rt/itcms/iter
     i32.load offset=4
     i32.const -4
     i32.and
     local.set $0
     loop $while-continue|2
      local.get $0
      global.get $~lib/rt/itcms/toSpace
      i32.ne
      if
       local.get $1
       local.get $0
       i32.load offset=4
       i32.const 3
       i32.and
       i32.ne
       if
        local.get $0
        local.get $0
        i32.load offset=4
        i32.const -4
        i32.and
        local.get $1
        i32.or
        i32.store offset=4
        local.get $0
        i32.const 20
        i32.add
        call $~lib/rt/__visit_members
       end
       local.get $0
       i32.load offset=4
       i32.const -4
       i32.and
       local.set $0
       br $while-continue|2
      end
     end
     global.get $~lib/rt/itcms/fromSpace
     local.set $0
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/fromSpace
     local.get $0
     global.set $~lib/rt/itcms/toSpace
     local.get $1
     global.set $~lib/rt/itcms/white
     local.get $0
     i32.load offset=4
     i32.const -4
     i32.and
     global.set $~lib/rt/itcms/iter
     i32.const 2
     global.set $~lib/rt/itcms/state
    end
    global.get $~lib/rt/itcms/visitCount
    return
   end
   global.get $~lib/rt/itcms/iter
   local.tee $0
   global.get $~lib/rt/itcms/toSpace
   i32.ne
   if
    local.get $0
    i32.load offset=4
    local.tee $1
    i32.const -4
    i32.and
    global.set $~lib/rt/itcms/iter
    global.get $~lib/rt/itcms/white
    i32.eqz
    local.get $1
    i32.const 3
    i32.and
    i32.ne
    if
     i32.const 0
     i32.const 1056
     i32.const 228
     i32.const 20
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    i32.const 25876
    i32.lt_u
    if
     local.get $0
     i32.const 0
     i32.store offset=4
     local.get $0
     i32.const 0
     i32.store offset=8
    else
     global.get $~lib/rt/itcms/total
     local.get $0
     i32.load
     i32.const -4
     i32.and
     i32.const 4
     i32.add
     i32.sub
     global.set $~lib/rt/itcms/total
     local.get $0
     i32.const 4
     i32.add
     local.tee $0
     i32.const 25876
     i32.ge_u
     if
      global.get $~lib/rt/tlsf/ROOT
      i32.eqz
      if
       call $~lib/rt/tlsf/initialize
      end
      global.get $~lib/rt/tlsf/ROOT
      local.set $1
      local.get $0
      i32.const 4
      i32.sub
      local.set $2
      local.get $0
      i32.const 15
      i32.and
      i32.const 1
      local.get $0
      select
      if (result i32)
       i32.const 1
      else
       local.get $2
       i32.load
       i32.const 1
       i32.and
      end
      if
       i32.const 0
       i32.const 1392
       i32.const 559
       i32.const 3
       call $~lib/builtins/abort
       unreachable
      end
      local.get $2
      local.get $2
      i32.load
      i32.const 1
      i32.or
      i32.store
      local.get $1
      local.get $2
      call $~lib/rt/tlsf/insertBlock
     end
    end
    i32.const 10
    return
   end
   global.get $~lib/rt/itcms/toSpace
   local.tee $0
   local.get $0
   i32.store offset=4
   local.get $0
   local.get $0
   i32.store offset=8
   i32.const 0
   global.set $~lib/rt/itcms/state
  end
  i32.const 0
 )
 (func $~lib/rt/tlsf/searchBlock (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $1
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $1
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   local.get $1
   i32.const 1
   i32.const 27
   local.get $1
   i32.clz
   i32.sub
   i32.shl
   i32.add
   i32.const 1
   i32.sub
   local.get $1
   local.get $1
   i32.const 536870910
   i32.lt_u
   select
   local.tee $1
   i32.clz
   i32.sub
   local.tee $3
   i32.const 7
   i32.sub
   local.set $2
   local.get $1
   local.get $3
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $1
  i32.const 16
  i32.lt_u
  local.get $2
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 330
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=4
  i32.const -1
  local.get $1
  i32.shl
  i32.and
  local.tee $1
  if (result i32)
   local.get $0
   local.get $1
   i32.ctz
   local.get $2
   i32.const 4
   i32.shl
   i32.add
   i32.const 2
   i32.shl
   i32.add
   i32.load offset=96
  else
   local.get $0
   i32.load
   i32.const -1
   local.get $2
   i32.const 1
   i32.add
   i32.shl
   i32.and
   local.tee $1
   if (result i32)
    local.get $0
    local.get $1
    i32.ctz
    local.tee $1
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=4
    local.tee $2
    i32.eqz
    if
     i32.const 0
     i32.const 1392
     i32.const 343
     i32.const 18
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    local.get $2
    i32.ctz
    local.get $1
    i32.const 4
    i32.shl
    i32.add
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=96
   else
    i32.const 0
   end
  end
 )
 (func $~lib/rt/itcms/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $0
  i32.const 1073741804
  i32.ge_u
  if
   i32.const 1264
   i32.const 1056
   i32.const 260
   i32.const 31
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/total
  global.get $~lib/rt/itcms/threshold
  i32.ge_u
  if
   block $__inlined_func$~lib/rt/itcms/interrupt
    i32.const 2048
    local.set $2
    loop $do-loop|0
     local.get $2
     call $~lib/rt/itcms/step
     i32.sub
     local.set $2
     global.get $~lib/rt/itcms/state
     i32.eqz
     if
      global.get $~lib/rt/itcms/total
      i64.extend_i32_u
      i64.const 200
      i64.mul
      i64.const 100
      i64.div_u
      i32.wrap_i64
      i32.const 1024
      i32.add
      global.set $~lib/rt/itcms/threshold
      br $__inlined_func$~lib/rt/itcms/interrupt
     end
     local.get $2
     i32.const 0
     i32.gt_s
     br_if $do-loop|0
    end
    global.get $~lib/rt/itcms/total
    local.tee $2
    local.get $2
    global.get $~lib/rt/itcms/threshold
    i32.sub
    i32.const 1024
    i32.lt_u
    i32.const 10
    i32.shl
    i32.add
    global.set $~lib/rt/itcms/threshold
   end
  end
  global.get $~lib/rt/tlsf/ROOT
  i32.eqz
  if
   call $~lib/rt/tlsf/initialize
  end
  global.get $~lib/rt/tlsf/ROOT
  local.set $4
  local.get $0
  i32.const 16
  i32.add
  local.tee $2
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1264
   i32.const 1392
   i32.const 458
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  i32.const 12
  local.get $2
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.get $2
  i32.const 12
  i32.le_u
  select
  local.tee $5
  call $~lib/rt/tlsf/searchBlock
  local.tee $2
  i32.eqz
  if
   memory.size
   local.tee $2
   i32.const 4
   local.get $4
   i32.load offset=1568
   local.get $2
   i32.const 16
   i32.shl
   i32.const 4
   i32.sub
   i32.ne
   i32.shl
   local.get $5
   i32.const 1
   i32.const 27
   local.get $5
   i32.clz
   i32.sub
   i32.shl
   i32.const 1
   i32.sub
   i32.add
   local.get $5
   local.get $5
   i32.const 536870910
   i32.lt_u
   select
   i32.add
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $3
   local.get $2
   local.get $3
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $3
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
   local.get $4
   local.get $2
   i32.const 16
   i32.shl
   memory.size
   i32.const 16
   i32.shl
   call $~lib/rt/tlsf/addMemory
   local.get $4
   local.get $5
   call $~lib/rt/tlsf/searchBlock
   local.tee $2
   i32.eqz
   if
    i32.const 0
    i32.const 1392
    i32.const 496
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
  end
  local.get $5
  local.get $2
  i32.load
  i32.const -4
  i32.and
  i32.gt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 498
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  local.get $2
  call $~lib/rt/tlsf/removeBlock
  local.get $2
  i32.load
  local.set $3
  local.get $5
  i32.const 4
  i32.add
  i32.const 15
  i32.and
  if
   i32.const 0
   i32.const 1392
   i32.const 357
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $3
  i32.const -4
  i32.and
  local.get $5
  i32.sub
  local.tee $6
  i32.const 16
  i32.ge_u
  if
   local.get $2
   local.get $5
   local.get $3
   i32.const 2
   i32.and
   i32.or
   i32.store
   local.get $2
   i32.const 4
   i32.add
   local.get $5
   i32.add
   local.tee $3
   local.get $6
   i32.const 4
   i32.sub
   i32.const 1
   i32.or
   i32.store
   local.get $4
   local.get $3
   call $~lib/rt/tlsf/insertBlock
  else
   local.get $2
   local.get $3
   i32.const -2
   i32.and
   i32.store
   local.get $2
   i32.const 4
   i32.add
   local.get $2
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   local.get $3
   i32.load
   i32.const -3
   i32.and
   i32.store
  end
  local.get $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  global.get $~lib/rt/itcms/fromSpace
  local.tee $1
  i32.load offset=8
  local.set $3
  local.get $2
  local.get $1
  global.get $~lib/rt/itcms/white
  i32.or
  i32.store offset=4
  local.get $2
  local.get $3
  i32.store offset=8
  local.get $3
  local.get $2
  local.get $3
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  global.get $~lib/rt/itcms/total
  local.get $2
  i32.load
  i32.const -4
  i32.and
  i32.const 4
  i32.add
  i32.add
  global.set $~lib/rt/itcms/total
  local.get $2
  i32.const 20
  i32.add
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $~lib/string/String.__eq (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  local.get $1
  i32.eq
  if
   i32.const 1
   return
  end
  local.get $1
  i32.const 0
  local.get $0
  select
  i32.eqz
  if
   i32.const 0
   return
  end
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.tee $3
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.ne
  if
   i32.const 0
   return
  end
  local.get $0
  local.tee $2
  i32.const 7
  i32.and
  local.get $1
  i32.const 7
  i32.and
  i32.or
  i32.eqz
  local.get $3
  local.tee $0
  i32.const 4
  i32.ge_u
  i32.and
  if
   loop $do-loop|0
    local.get $2
    i64.load
    local.get $1
    i64.load
    i64.eq
    if
     local.get $2
     i32.const 8
     i32.add
     local.set $2
     local.get $1
     i32.const 8
     i32.add
     local.set $1
     local.get $0
     i32.const 4
     i32.sub
     local.tee $0
     i32.const 4
     i32.ge_u
     br_if $do-loop|0
    end
   end
  end
  block $__inlined_func$~lib/util/string/compareImpl
   loop $while-continue|1
    local.get $0
    local.tee $3
    i32.const 1
    i32.sub
    local.set $0
    local.get $3
    if
     local.get $2
     i32.load16_u
     local.tee $5
     local.get $1
     i32.load16_u
     local.tee $4
     i32.sub
     local.set $3
     local.get $4
     local.get $5
     i32.ne
     br_if $__inlined_func$~lib/util/string/compareImpl
     local.get $2
     i32.const 2
     i32.add
     local.set $2
     local.get $1
     i32.const 2
     i32.add
     local.set $1
     br $while-continue|1
    end
   end
   i32.const 0
   local.set $3
  end
  local.get $3
  i32.eqz
 )
 (func $~lib/array/Array<~lib/string/String>#__uset (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
  local.get $2
  if
   local.get $0
   local.get $2
   i32.const 1
   call $byn-split-outlined-A$~lib/rt/itcms/__link
  end
 )
 (func $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 1152
    i32.const 1536
    i32.const 130
    i32.const 22
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   local.get $0
   i32.load offset=8
   local.tee $4
   i32.const 2
   i32.shr_u
   i32.gt_u
   if
    local.get $3
    i32.const 268435455
    i32.gt_u
    if
     i32.const 1488
     i32.const 1536
     i32.const 19
     i32.const 48
     call $~lib/builtins/abort
     unreachable
    end
    block $__inlined_func$~lib/rt/itcms/__renew
     local.get $4
     i32.const 1
     i32.shl
     local.tee $4
     i32.const 1073741820
     local.get $4
     i32.const 1073741820
     i32.lt_u
     select
     local.tee $4
     local.get $3
     i32.const 8
     local.get $3
     i32.const 8
     i32.gt_u
     select
     i32.const 2
     i32.shl
     local.tee $3
     local.get $3
     local.get $4
     i32.lt_u
     select
     local.tee $5
     local.get $0
     i32.load
     local.tee $4
     i32.const 20
     i32.sub
     local.tee $6
     i32.load
     i32.const -4
     i32.and
     i32.const 16
     i32.sub
     i32.le_u
     if
      local.get $6
      local.get $5
      i32.store offset=16
      local.get $4
      local.set $3
      br $__inlined_func$~lib/rt/itcms/__renew
     end
     local.get $5
     local.get $6
     i32.load offset=12
     call $~lib/rt/itcms/__new
     local.tee $3
     local.get $4
     local.get $5
     local.get $6
     i32.load offset=16
     local.tee $6
     local.get $5
     local.get $6
     i32.lt_u
     select
     memory.copy
    end
    local.get $3
    local.get $4
    i32.ne
    if
     local.get $0
     local.get $3
     i32.store
     local.get $0
     local.get $3
     i32.store offset=4
     local.get $3
     if
      local.get $0
      local.get $3
      i32.const 0
      call $byn-split-outlined-A$~lib/rt/itcms/__link
     end
    end
    local.get $0
    local.get $5
    i32.store offset=8
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   i32.store offset=12
  end
  local.get $0
  local.get $1
  local.get $2
  call $~lib/array/Array<~lib/string/String>#__uset
 )
 (func $~lib/string/String.__concat (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  block $__inlined_func$~lib/string/String#concat
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.const 1
   i32.shl
   local.tee $3
   local.get $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.const 1
   i32.shl
   local.tee $4
   i32.add
   local.tee $2
   i32.eqz
   if
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
    i32.const 1744
    local.set $2
    br $__inlined_func$~lib/string/String#concat
   end
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.const 1
   call $~lib/rt/itcms/__new
   local.tee $2
   i32.store
   local.get $2
   local.get $0
   local.get $3
   memory.copy
   local.get $2
   local.get $3
   i32.add
   local.get $1
   local.get $4
   memory.copy
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
  end
  local.get $2
 )
 (func $assembly/index/fibonacci (param $0 f64) (result f64)
  local.get $0
  f64.const 0
  f64.eq
  if
   f64.const 0
   return
  end
  local.get $0
  f64.const 1
  f64.eq
  if
   f64.const 1
   return
  end
  local.get $0
  f64.const 1
  f64.sub
  call $assembly/index/fibonacci
  local.get $0
  f64.const 2
  f64.sub
  call $assembly/index/fibonacci
  f64.add
 )
 (func $~lib/util/string/strtol<f64> (param $0 i32) (result f64)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 f64)
  (local $5 f64)
  (local $6 i32)
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.tee $1
  i32.eqz
  if
   f64.const nan:0x8000000000000
   return
  end
  local.get $0
  local.tee $2
  i32.load16_u
  local.set $0
  loop $while-continue|0
   block $__inlined_func$~lib/util/string/isSpace (result i32)
    local.get $0
    i32.const 128
    i32.or
    i32.const 160
    i32.eq
    local.get $0
    i32.const 9
    i32.sub
    i32.const 4
    i32.le_u
    i32.or
    local.get $0
    i32.const 5760
    i32.lt_u
    br_if $__inlined_func$~lib/util/string/isSpace
    drop
    i32.const 1
    local.get $0
    i32.const -8192
    i32.add
    i32.const 10
    i32.le_u
    br_if $__inlined_func$~lib/util/string/isSpace
    drop
    block $break|0
     block $case6|0
      local.get $0
      i32.const 5760
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 8232
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 8233
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 8239
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 8287
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 12288
      i32.eq
      br_if $case6|0
      local.get $0
      i32.const 65279
      i32.eq
      br_if $case6|0
      br $break|0
     end
     i32.const 1
     br $__inlined_func$~lib/util/string/isSpace
    end
    i32.const 0
   end
   if
    local.get $2
    i32.const 2
    i32.add
    local.tee $2
    i32.load16_u
    local.set $0
    local.get $1
    i32.const 1
    i32.sub
    local.set $1
    br $while-continue|0
   end
  end
  f64.const 1
  local.set $4
  local.get $0
  i32.const 43
  i32.eq
  local.get $0
  i32.const 45
  i32.eq
  i32.or
  if (result i32)
   local.get $1
   i32.const 1
   i32.sub
   local.tee $1
   i32.eqz
   if
    f64.const nan:0x8000000000000
    return
   end
   f64.const -1
   f64.const 1
   local.get $0
   i32.const 45
   i32.eq
   select
   local.set $4
   local.get $2
   i32.const 2
   i32.add
   local.tee $2
   i32.load16_u
  else
   local.get $0
  end
  i32.const 48
  i32.eq
  local.get $1
  i32.const 2
  i32.gt_s
  i32.and
  if
   block $break|1
    block $case2|1
     block $case1|1
      local.get $2
      i32.load16_u offset=2
      i32.const 32
      i32.or
      local.tee $0
      i32.const 98
      i32.ne
      if
       local.get $0
       i32.const 111
       i32.eq
       br_if $case1|1
       local.get $0
       i32.const 120
       i32.eq
       br_if $case2|1
       br $break|1
      end
      local.get $2
      i32.const 4
      i32.add
      local.set $2
      local.get $1
      i32.const 2
      i32.sub
      local.set $1
      i32.const 2
      local.set $3
      br $break|1
     end
     local.get $2
     i32.const 4
     i32.add
     local.set $2
     local.get $1
     i32.const 2
     i32.sub
     local.set $1
     i32.const 8
     local.set $3
     br $break|1
    end
    local.get $2
    i32.const 4
    i32.add
    local.set $2
    local.get $1
    i32.const 2
    i32.sub
    local.set $1
    i32.const 16
    local.set $3
   end
  end
  local.get $3
  i32.const 10
  local.get $3
  select
  local.set $3
  local.get $1
  i32.const 1
  i32.sub
  local.set $6
  loop $while-continue|2
   block $while-break|2
    local.get $1
    local.tee $0
    i32.const 1
    i32.sub
    local.set $1
    local.get $0
    if
     local.get $3
     local.get $2
     i32.load16_u
     local.tee $0
     i32.const 48
     i32.sub
     i32.const 10
     i32.lt_u
     if (result i32)
      local.get $0
      i32.const 48
      i32.sub
     else
      local.get $0
      i32.const 65
      i32.sub
      i32.const 25
      i32.le_u
      if (result i32)
       local.get $0
       i32.const 55
       i32.sub
      else
       local.get $0
       i32.const 87
       i32.sub
       local.get $0
       local.get $0
       i32.const 97
       i32.sub
       i32.const 25
       i32.le_u
       select
      end
     end
     local.tee $0
     i32.le_u
     if
      local.get $1
      local.get $6
      i32.eq
      if
       f64.const nan:0x8000000000000
       return
      end
      br $while-break|2
     end
     local.get $5
     local.get $3
     f64.convert_i32_s
     f64.mul
     local.get $0
     f64.convert_i32_u
     f64.add
     local.set $5
     local.get $2
     i32.const 2
     i32.add
     local.set $2
     br $while-continue|2
    end
   end
  end
  local.get $4
  local.get $5
  f64.mul
 )
 (func $~lib/util/number/genDigits (param $0 i64) (param $1 i64) (param $2 i32) (param $3 i64) (param $4 i32) (result i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i64)
  (local $8 i64)
  (local $9 i32)
  (local $10 i64)
  (local $11 i64)
  local.get $1
  local.get $0
  i64.sub
  local.set $8
  i64.const 1
  i32.const 0
  local.get $2
  i32.sub
  local.tee $9
  i64.extend_i32_s
  local.tee $0
  i64.shl
  local.tee $10
  i64.const 1
  i64.sub
  local.tee $11
  local.get $1
  i64.and
  local.set $7
  local.get $1
  local.get $0
  i64.shr_u
  i32.wrap_i64
  local.tee $5
  i32.const 100000
  i32.lt_u
  if (result i32)
   local.get $5
   i32.const 100
   i32.lt_u
   if (result i32)
    local.get $5
    i32.const 10
    i32.ge_u
    i32.const 1
    i32.add
   else
    local.get $5
    i32.const 10000
    i32.ge_u
    i32.const 3
    i32.add
    local.get $5
    i32.const 1000
    i32.ge_u
    i32.add
   end
  else
   local.get $5
   i32.const 10000000
   i32.lt_u
   if (result i32)
    local.get $5
    i32.const 1000000
    i32.ge_u
    i32.const 6
    i32.add
   else
    local.get $5
    i32.const 1000000000
    i32.ge_u
    i32.const 8
    i32.add
    local.get $5
    i32.const 100000000
    i32.ge_u
    i32.add
   end
  end
  local.set $2
  loop $while-continue|0
   local.get $2
   i32.const 0
   i32.gt_s
   if
    block $break|1
     block $case10|1
      block $case9|1
       block $case8|1
        block $case7|1
         block $case6|1
          block $case5|1
           block $case4|1
            block $case3|1
             block $case2|1
              block $case1|1
               block $case0|1
                local.get $2
                i32.const 1
                i32.sub
                br_table $case9|1 $case8|1 $case7|1 $case6|1 $case5|1 $case4|1 $case3|1 $case2|1 $case1|1 $case0|1 $case10|1
               end
               local.get $5
               i32.const 1000000000
               i32.div_u
               local.set $6
               local.get $5
               i32.const 1000000000
               i32.rem_u
               local.set $5
               br $break|1
              end
              local.get $5
              i32.const 100000000
              i32.div_u
              local.set $6
              local.get $5
              i32.const 100000000
              i32.rem_u
              local.set $5
              br $break|1
             end
             local.get $5
             i32.const 10000000
             i32.div_u
             local.set $6
             local.get $5
             i32.const 10000000
             i32.rem_u
             local.set $5
             br $break|1
            end
            local.get $5
            i32.const 1000000
            i32.div_u
            local.set $6
            local.get $5
            i32.const 1000000
            i32.rem_u
            local.set $5
            br $break|1
           end
           local.get $5
           i32.const 100000
           i32.div_u
           local.set $6
           local.get $5
           i32.const 100000
           i32.rem_u
           local.set $5
           br $break|1
          end
          local.get $5
          i32.const 10000
          i32.div_u
          local.set $6
          local.get $5
          i32.const 10000
          i32.rem_u
          local.set $5
          br $break|1
         end
         local.get $5
         i32.const 1000
         i32.div_u
         local.set $6
         local.get $5
         i32.const 1000
         i32.rem_u
         local.set $5
         br $break|1
        end
        local.get $5
        i32.const 100
        i32.div_u
        local.set $6
        local.get $5
        i32.const 100
        i32.rem_u
        local.set $5
        br $break|1
       end
       local.get $5
       i32.const 10
       i32.div_u
       local.set $6
       local.get $5
       i32.const 10
       i32.rem_u
       local.set $5
       br $break|1
      end
      local.get $5
      local.set $6
      i32.const 0
      local.set $5
      br $break|1
     end
     i32.const 0
     local.set $6
    end
    local.get $4
    local.get $6
    i32.or
    if
     local.get $4
     i32.const 1
     i32.shl
     i32.const 5008
     i32.add
     local.get $6
     i32.const 65535
     i32.and
     i32.const 48
     i32.add
     i32.store16
     local.get $4
     i32.const 1
     i32.add
     local.set $4
    end
    local.get $2
    i32.const 1
    i32.sub
    local.set $2
    local.get $3
    local.get $5
    i64.extend_i32_u
    local.get $9
    i64.extend_i32_s
    i64.shl
    local.get $7
    i64.add
    local.tee $0
    i64.ge_u
    if
     global.get $~lib/util/number/_K
     local.get $2
     i32.add
     global.set $~lib/util/number/_K
     local.get $2
     i32.const 2
     i32.shl
     i32.const 5936
     i32.add
     i64.load32_u
     local.get $9
     i64.extend_i32_s
     i64.shl
     local.set $1
     local.get $4
     i32.const 1
     i32.shl
     i32.const 5006
     i32.add
     local.tee $5
     i32.load16_u
     local.set $2
     loop $while-continue|3
      local.get $0
      local.get $8
      i64.lt_u
      local.get $3
      local.get $0
      i64.sub
      local.get $1
      i64.ge_u
      i32.and
      if (result i32)
       local.get $8
       local.get $0
       local.get $1
       i64.add
       local.tee $7
       i64.gt_u
       local.get $8
       local.get $0
       i64.sub
       local.get $7
       local.get $8
       i64.sub
       i64.gt_u
       i32.or
      else
       i32.const 0
      end
      if
       local.get $2
       i32.const 1
       i32.sub
       local.set $2
       local.get $0
       local.get $1
       i64.add
       local.set $0
       br $while-continue|3
      end
     end
     local.get $5
     local.get $2
     i32.store16
     local.get $4
     return
    end
    br $while-continue|0
   end
  end
  loop $while-continue|4
   local.get $3
   i64.const 10
   i64.mul
   local.set $3
   local.get $7
   i64.const 10
   i64.mul
   local.tee $0
   local.get $9
   i64.extend_i32_s
   i64.shr_u
   local.tee $1
   local.get $4
   i64.extend_i32_s
   i64.or
   i64.const 0
   i64.ne
   if
    local.get $4
    local.tee $5
    i32.const 1
    i32.add
    local.set $4
    local.get $5
    i32.const 1
    i32.shl
    i32.const 5008
    i32.add
    local.get $1
    i32.wrap_i64
    i32.const 65535
    i32.and
    i32.const 48
    i32.add
    i32.store16
   end
   local.get $2
   i32.const 1
   i32.sub
   local.set $2
   local.get $0
   local.get $11
   i64.and
   local.tee $7
   local.get $3
   i64.ge_u
   br_if $while-continue|4
  end
  global.get $~lib/util/number/_K
  local.get $2
  i32.add
  global.set $~lib/util/number/_K
  local.get $7
  local.set $0
  local.get $8
  i32.const 0
  local.get $2
  i32.sub
  i32.const 2
  i32.shl
  i32.const 5936
  i32.add
  i64.load32_u
  i64.mul
  local.set $1
  local.get $4
  i32.const 1
  i32.shl
  i32.const 5006
  i32.add
  local.tee $5
  i32.load16_u
  local.set $2
  loop $while-continue|6
   local.get $0
   local.get $1
   i64.lt_u
   local.get $3
   local.get $0
   i64.sub
   local.get $10
   i64.ge_u
   i32.and
   if (result i32)
    local.get $1
    local.get $0
    i64.sub
    local.get $0
    local.get $10
    i64.add
    local.tee $7
    local.get $1
    i64.sub
    i64.gt_u
    local.get $1
    local.get $7
    i64.gt_u
    i32.or
   else
    i32.const 0
   end
   if
    local.get $2
    i32.const 1
    i32.sub
    local.set $2
    local.get $0
    local.get $10
    i64.add
    local.set $0
    br $while-continue|6
   end
  end
  local.get $5
  local.get $2
  i32.store16
  local.get $4
 )
 (func $~lib/util/number/utoa32_dec_lut (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  loop $while-continue|0
   local.get $1
   i32.const 10000
   i32.ge_u
   if
    local.get $1
    i32.const 10000
    i32.rem_u
    local.set $3
    local.get $1
    i32.const 10000
    i32.div_u
    local.set $1
    local.get $0
    local.get $2
    i32.const 4
    i32.sub
    local.tee $2
    i32.const 1
    i32.shl
    i32.add
    local.get $3
    i32.const 100
    i32.div_u
    i32.const 2
    i32.shl
    i32.const 5976
    i32.add
    i64.load32_u
    local.get $3
    i32.const 100
    i32.rem_u
    i32.const 2
    i32.shl
    i32.const 5976
    i32.add
    i64.load32_u
    i64.const 32
    i64.shl
    i64.or
    i64.store
    br $while-continue|0
   end
  end
  local.get $1
  i32.const 100
  i32.ge_u
  if
   local.get $0
   local.get $2
   i32.const 2
   i32.sub
   local.tee $2
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 100
   i32.rem_u
   i32.const 2
   i32.shl
   i32.const 5976
   i32.add
   i32.load
   i32.store
   local.get $1
   i32.const 100
   i32.div_u
   local.set $1
  end
  local.get $1
  i32.const 10
  i32.ge_u
  if
   local.get $0
   local.get $2
   i32.const 2
   i32.sub
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 2
   i32.shl
   i32.const 5976
   i32.add
   i32.load
   i32.store
  else
   local.get $0
   local.get $2
   i32.const 1
   i32.sub
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 48
   i32.add
   i32.store16
  end
 )
 (func $~lib/util/number/prettify (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  local.get $2
  i32.eqz
  if
   local.get $0
   local.get $1
   i32.const 1
   i32.shl
   i32.add
   i32.const 3145774
   i32.store
   local.get $1
   i32.const 2
   i32.add
   return
  end
  local.get $1
  local.get $2
  i32.add
  local.tee $3
  i32.const 21
  i32.le_s
  local.get $1
  local.get $3
  i32.le_s
  i32.and
  if (result i32)
   loop $for-loop|0
    local.get $1
    local.get $3
    i32.lt_s
    if
     local.get $0
     local.get $1
     i32.const 1
     i32.shl
     i32.add
     i32.const 48
     i32.store16
     local.get $1
     i32.const 1
     i32.add
     local.set $1
     br $for-loop|0
    end
   end
   local.get $0
   local.get $3
   i32.const 1
   i32.shl
   i32.add
   i32.const 3145774
   i32.store
   local.get $3
   i32.const 2
   i32.add
  else
   local.get $3
   i32.const 21
   i32.le_s
   local.get $3
   i32.const 0
   i32.gt_s
   i32.and
   if (result i32)
    local.get $0
    local.get $3
    i32.const 1
    i32.shl
    i32.add
    local.tee $0
    i32.const 2
    i32.add
    local.get $0
    i32.const 0
    local.get $2
    i32.sub
    i32.const 1
    i32.shl
    memory.copy
    local.get $0
    i32.const 46
    i32.store16
    local.get $1
    i32.const 1
    i32.add
   else
    local.get $3
    i32.const 0
    i32.le_s
    local.get $3
    i32.const -6
    i32.gt_s
    i32.and
    if (result i32)
     local.get $0
     i32.const 2
     local.get $3
     i32.sub
     local.tee $3
     i32.const 1
     i32.shl
     i32.add
     local.get $0
     local.get $1
     i32.const 1
     i32.shl
     memory.copy
     local.get $0
     i32.const 3014704
     i32.store
     i32.const 2
     local.set $2
     loop $for-loop|1
      local.get $2
      local.get $3
      i32.lt_s
      if
       local.get $0
       local.get $2
       i32.const 1
       i32.shl
       i32.add
       i32.const 48
       i32.store16
       local.get $2
       i32.const 1
       i32.add
       local.set $2
       br $for-loop|1
      end
     end
     local.get $1
     local.get $3
     i32.add
    else
     local.get $1
     i32.const 1
     i32.eq
     if
      local.get $0
      i32.const 101
      i32.store16 offset=2
      local.get $0
      i32.const 4
      i32.add
      local.tee $2
      local.get $3
      i32.const 1
      i32.sub
      local.tee $0
      i32.const 0
      i32.lt_s
      local.tee $3
      if
       i32.const 0
       local.get $0
       i32.sub
       local.set $0
      end
      local.get $0
      local.get $0
      i32.const 100000
      i32.lt_u
      if (result i32)
       local.get $0
       i32.const 100
       i32.lt_u
       if (result i32)
        local.get $0
        i32.const 10
        i32.ge_u
        i32.const 1
        i32.add
       else
        local.get $0
        i32.const 10000
        i32.ge_u
        i32.const 3
        i32.add
        local.get $0
        i32.const 1000
        i32.ge_u
        i32.add
       end
      else
       local.get $0
       i32.const 10000000
       i32.lt_u
       if (result i32)
        local.get $0
        i32.const 1000000
        i32.ge_u
        i32.const 6
        i32.add
       else
        local.get $0
        i32.const 1000000000
        i32.ge_u
        i32.const 8
        i32.add
        local.get $0
        i32.const 100000000
        i32.ge_u
        i32.add
       end
      end
      i32.const 1
      i32.add
      local.tee $1
      call $~lib/util/number/utoa32_dec_lut
      local.get $2
      i32.const 45
      i32.const 43
      local.get $3
      select
      i32.store16
     else
      local.get $0
      i32.const 4
      i32.add
      local.get $0
      i32.const 2
      i32.add
      local.get $1
      i32.const 1
      i32.shl
      local.tee $2
      i32.const 2
      i32.sub
      memory.copy
      local.get $0
      i32.const 46
      i32.store16 offset=2
      local.get $0
      local.get $2
      i32.add
      local.tee $0
      i32.const 101
      i32.store16 offset=2
      local.get $0
      i32.const 4
      i32.add
      local.tee $4
      local.get $3
      i32.const 1
      i32.sub
      local.tee $0
      i32.const 0
      i32.lt_s
      local.tee $2
      if
       i32.const 0
       local.get $0
       i32.sub
       local.set $0
      end
      local.get $0
      local.get $0
      i32.const 100000
      i32.lt_u
      if (result i32)
       local.get $0
       i32.const 100
       i32.lt_u
       if (result i32)
        local.get $0
        i32.const 10
        i32.ge_u
        i32.const 1
        i32.add
       else
        local.get $0
        i32.const 10000
        i32.ge_u
        i32.const 3
        i32.add
        local.get $0
        i32.const 1000
        i32.ge_u
        i32.add
       end
      else
       local.get $0
       i32.const 10000000
       i32.lt_u
       if (result i32)
        local.get $0
        i32.const 1000000
        i32.ge_u
        i32.const 6
        i32.add
       else
        local.get $0
        i32.const 1000000000
        i32.ge_u
        i32.const 8
        i32.add
        local.get $0
        i32.const 100000000
        i32.ge_u
        i32.add
       end
      end
      i32.const 1
      i32.add
      local.tee $0
      call $~lib/util/number/utoa32_dec_lut
      local.get $4
      i32.const 45
      i32.const 43
      local.get $2
      select
      i32.store16
      local.get $0
      local.get $1
      i32.add
      local.set $1
     end
     local.get $1
     i32.const 2
     i32.add
    end
   end
  end
 )
 (func $~lib/util/number/dtoa_core (param $0 f64) (result i32)
  (local $1 i64)
  (local $2 i32)
  (local $3 i64)
  (local $4 i64)
  (local $5 i64)
  (local $6 i64)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i64)
  (local $11 i64)
  (local $12 i64)
  (local $13 i64)
  (local $14 i64)
  local.get $0
  f64.const 0
  f64.lt
  local.tee $2
  if (result f64)
   i32.const 5008
   i32.const 45
   i32.store16
   local.get $0
   f64.neg
  else
   local.get $0
  end
  i64.reinterpret_f64
  local.tee $1
  i64.const 9218868437227405312
  i64.and
  i64.const 52
  i64.shr_u
  i32.wrap_i64
  local.tee $7
  i32.const 1
  local.get $7
  select
  i32.const 1075
  i32.sub
  local.tee $8
  i32.const 1
  i32.sub
  local.get $1
  i64.const 4503599627370495
  i64.and
  local.get $7
  i32.const 0
  i32.ne
  i64.extend_i32_u
  i64.const 52
  i64.shl
  i64.add
  local.tee $1
  i64.const 1
  i64.shl
  i64.const 1
  i64.add
  local.tee $3
  i64.clz
  i32.wrap_i64
  local.tee $7
  i32.sub
  local.set $9
  local.get $3
  local.get $7
  i64.extend_i32_s
  i64.shl
  global.set $~lib/util/number/_frc_plus
  local.get $1
  local.get $1
  i64.const 4503599627370496
  i64.eq
  i32.const 1
  i32.add
  local.tee $7
  i64.extend_i32_s
  i64.shl
  i64.const 1
  i64.sub
  local.get $8
  local.get $7
  i32.sub
  local.get $9
  i32.sub
  i64.extend_i32_s
  i64.shl
  global.set $~lib/util/number/_frc_minus
  local.get $9
  global.set $~lib/util/number/_exp
  i32.const 348
  i32.const -61
  global.get $~lib/util/number/_exp
  local.tee $7
  i32.sub
  f64.convert_i32_s
  f64.const 0.30102999566398114
  f64.mul
  f64.const 347
  f64.add
  local.tee $0
  i32.trunc_sat_f64_s
  local.tee $8
  local.get $8
  f64.convert_i32_s
  local.get $0
  f64.ne
  i32.add
  i32.const 3
  i32.shr_s
  i32.const 1
  i32.add
  local.tee $8
  i32.const 3
  i32.shl
  local.tee $9
  i32.sub
  global.set $~lib/util/number/_K
  local.get $9
  i32.const 5064
  i32.add
  i64.load
  global.set $~lib/util/number/_frc_pow
  local.get $8
  i32.const 1
  i32.shl
  i32.const 5760
  i32.add
  i32.load16_s
  global.set $~lib/util/number/_exp_pow
  local.get $1
  local.get $1
  i64.clz
  i64.shl
  local.tee $1
  i64.const 4294967295
  i64.and
  local.set $4
  global.get $~lib/util/number/_frc_pow
  local.tee $10
  i64.const 4294967295
  i64.and
  local.tee $11
  local.get $1
  i64.const 32
  i64.shr_u
  local.tee $1
  i64.mul
  local.get $4
  local.get $11
  i64.mul
  i64.const 32
  i64.shr_u
  i64.add
  local.set $5
  global.get $~lib/util/number/_frc_plus
  local.tee $3
  i64.const 4294967295
  i64.and
  local.set $12
  local.get $3
  i64.const 32
  i64.shr_u
  local.tee $3
  local.get $11
  i64.mul
  local.get $11
  local.get $12
  i64.mul
  i64.const 32
  i64.shr_u
  i64.add
  local.set $6
  global.get $~lib/util/number/_frc_minus
  local.tee $13
  i64.const 4294967295
  i64.and
  local.set $14
  local.get $13
  i64.const 32
  i64.shr_u
  local.tee $13
  local.get $11
  i64.mul
  local.get $11
  local.get $14
  i64.mul
  i64.const 32
  i64.shr_u
  i64.add
  local.set $11
  local.get $2
  i32.const 1
  i32.shl
  i32.const 5008
  i32.add
  local.get $1
  local.get $10
  i64.const 32
  i64.shr_u
  local.tee $1
  i64.mul
  local.get $5
  i64.const 32
  i64.shr_u
  i64.add
  local.get $1
  local.get $4
  i64.mul
  local.get $5
  i64.const 4294967295
  i64.and
  i64.add
  i64.const 2147483647
  i64.add
  i64.const 32
  i64.shr_u
  i64.add
  local.get $1
  local.get $3
  i64.mul
  local.get $6
  i64.const 32
  i64.shr_u
  i64.add
  local.get $1
  local.get $12
  i64.mul
  local.get $6
  i64.const 4294967295
  i64.and
  i64.add
  i64.const 2147483647
  i64.add
  i64.const 32
  i64.shr_u
  i64.add
  i64.const 1
  i64.sub
  local.tee $3
  local.get $7
  global.get $~lib/util/number/_exp_pow
  i32.add
  i32.const -64
  i32.sub
  local.get $3
  local.get $1
  local.get $13
  i64.mul
  local.get $11
  i64.const 32
  i64.shr_u
  i64.add
  local.get $1
  local.get $14
  i64.mul
  local.get $11
  i64.const 4294967295
  i64.and
  i64.add
  i64.const 2147483647
  i64.add
  i64.const 32
  i64.shr_u
  i64.add
  i64.const 1
  i64.add
  i64.sub
  local.get $2
  call $~lib/util/number/genDigits
  local.get $2
  i32.sub
  global.get $~lib/util/number/_K
  call $~lib/util/number/prettify
  local.get $2
  i32.add
 )
 (func $~lib/staticarray/StaticArray<~lib/string/String>#__uset (param $0 i32) (param $1 i32)
  local.get $0
  i32.const 2
  i32.shl
  i32.const 8832
  i32.add
  local.get $1
  i32.store
  local.get $1
  if
   i32.const 8832
   local.get $1
   i32.const 1
   call $byn-split-outlined-A$~lib/rt/itcms/__link
  end
 )
 (func $~lib/rt/itcms/__pin (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $1
   i32.load offset=4
   i32.const 3
   i32.and
   i32.const 3
   i32.eq
   if
    i32.const 9296
    i32.const 1056
    i32.const 337
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   call $~lib/rt/itcms/Object#unlink
   global.get $~lib/rt/itcms/pinSpace
   local.tee $3
   i32.load offset=8
   local.set $2
   local.get $1
   local.get $3
   i32.const 3
   i32.or
   i32.store offset=4
   local.get $1
   local.get $2
   i32.store offset=8
   local.get $2
   local.get $1
   local.get $2
   i32.load offset=4
   i32.const 3
   i32.and
   i32.or
   i32.store offset=4
   local.get $3
   local.get $1
   i32.store offset=8
  end
  local.get $0
 )
 (func $~lib/rt/itcms/__unpin (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.eqz
  if
   return
  end
  local.get $0
  i32.const 20
  i32.sub
  local.tee $1
  i32.load offset=4
  i32.const 3
  i32.and
  i32.const 3
  i32.ne
  if
   i32.const 9360
   i32.const 1056
   i32.const 351
   i32.const 5
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/state
  i32.const 1
  i32.eq
  if
   local.get $1
   call $~lib/rt/itcms/Object#makeGray
  else
   local.get $1
   call $~lib/rt/itcms/Object#unlink
   global.get $~lib/rt/itcms/fromSpace
   local.tee $0
   i32.load offset=8
   local.set $2
   local.get $1
   local.get $0
   global.get $~lib/rt/itcms/white
   i32.or
   i32.store offset=4
   local.get $1
   local.get $2
   i32.store offset=8
   local.get $2
   local.get $1
   local.get $2
   i32.load offset=4
   i32.const 3
   i32.and
   i32.or
   i32.store offset=4
   local.get $0
   local.get $1
   i32.store offset=8
  end
 )
 (func $~lib/rt/itcms/__collect
  global.get $~lib/rt/itcms/state
  i32.const 0
  i32.gt_s
  if
   loop $while-continue|0
    global.get $~lib/rt/itcms/state
    if
     call $~lib/rt/itcms/step
     drop
     br $while-continue|0
    end
   end
  end
  call $~lib/rt/itcms/step
  drop
  loop $while-continue|1
   global.get $~lib/rt/itcms/state
   if
    call $~lib/rt/itcms/step
    drop
    br $while-continue|1
   end
  end
  global.get $~lib/rt/itcms/total
  i64.extend_i32_u
  i64.const 200
  i64.mul
  i64.const 100
  i64.div_u
  i32.wrap_i64
  i32.const 1024
  i32.add
  global.set $~lib/rt/itcms/threshold
 )
 (func $~lib/array/Array<~lib/string/String>~visit (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.load offset=4
  local.tee $1
  local.get $0
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  local.set $3
  loop $while-continue|0
   local.get $1
   local.get $3
   i32.lt_u
   if
    local.get $1
    i32.load
    local.tee $2
    if
     local.get $2
     call $byn-split-outlined-A$~lib/rt/itcms/__visit
    end
    local.get $1
    i32.const 4
    i32.add
    local.set $1
    br $while-continue|0
   end
  end
  local.get $0
  i32.load
  local.tee $0
  if
   local.get $0
   call $byn-split-outlined-A$~lib/rt/itcms/__visit
  end
 )
 (func $~lib/rt/__visit_members (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  block $folding-inner0
   block $invalid
    block $~lib/staticarray/StaticArray<~lib/string/String>
     block $~lib/date/Date
      block $~lib/array/Array<~lib/array/Array<~lib/string/String>>
       block $assembly/index/ModelSpec
        block $~lib/array/Array<~lib/string/String>
         block $assembly/neural-net/IRegularizationFunction
          block $~lib/string/String
           block $~lib/arraybuffer/ArrayBuffer
            local.get $0
            i32.const 8
            i32.sub
            i32.load
            br_table $~lib/arraybuffer/ArrayBuffer $~lib/string/String $folding-inner0 $assembly/neural-net/IRegularizationFunction $~lib/array/Array<~lib/string/String> $assembly/index/ModelSpec $~lib/array/Array<~lib/array/Array<~lib/string/String>> $folding-inner0 $~lib/date/Date $~lib/staticarray/StaticArray<~lib/string/String> $invalid
           end
           return
          end
          return
         end
         return
        end
        local.get $0
        call $~lib/array/Array<~lib/string/String>~visit
        return
       end
       local.get $0
       i32.load
       local.tee $1
       if
        local.get $1
        call $byn-split-outlined-A$~lib/rt/itcms/__visit
       end
       local.get $0
       i32.load offset=4
       local.tee $0
       if
        local.get $0
        call $byn-split-outlined-A$~lib/rt/itcms/__visit
       end
       return
      end
      local.get $0
      call $~lib/array/Array<~lib/string/String>~visit
      return
     end
     return
    end
    local.get $0
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.add
    local.set $1
    loop $while-continue|0
     local.get $0
     local.get $1
     i32.lt_u
     if
      local.get $0
      i32.load
      local.tee $2
      if
       local.get $2
       call $byn-split-outlined-A$~lib/rt/itcms/__visit
      end
      local.get $0
      i32.const 4
      i32.add
      local.set $0
      br $while-continue|0
     end
    end
    return
   end
   unreachable
  end
  local.get $0
  i32.load
  local.tee $0
  if
   local.get $0
   call $byn-split-outlined-A$~lib/rt/itcms/__visit
  end
 )
 (func $~start
  i32.const 1108
  i32.const 1104
  i32.store
  i32.const 1112
  i32.const 1104
  i32.store
  i32.const 1104
  global.set $~lib/rt/itcms/toSpace
  memory.size
  i32.const 16
  i32.shl
  i32.const 25876
  i32.sub
  i32.const 1
  i32.shr_u
  global.set $~lib/rt/itcms/threshold
  i32.const 1316
  i32.const 1312
  i32.store
  i32.const 1320
  i32.const 1312
  i32.store
  i32.const 1312
  global.set $~lib/rt/itcms/pinSpace
  i32.const 1348
  i32.const 1344
  i32.store
  i32.const 1352
  i32.const 1344
  i32.store
  i32.const 1344
  global.set $~lib/rt/itcms/fromSpace
 )
 (func $assembly/index/getModelSpec (result i32)
  (local $0 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i64.const 0
   i64.store
   local.get $0
   i32.const 1456
   i32.store
   local.get $0
   i32.const 1456
   i32.store offset=4
   local.get $0
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.store
   local.get $0
   i32.const 8
   i32.const 5
   call $~lib/rt/itcms/__new
   local.tee $0
   i32.store
   local.get $0
   i32.const 0
   i32.store
   local.get $0
   i32.const 0
   i32.store offset=4
   local.get $0
   i32.const 1456
   i32.store
   local.get $0
   i32.const 1456
   i32.const 0
   call $byn-split-outlined-A$~lib/rt/itcms/__link
   local.get $0
   i32.const 1456
   i32.store offset=4
   local.get $0
   i32.const 1456
   i32.const 0
   call $byn-split-outlined-A$~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/findVal (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  loop $for-loop|0
   local.get $3
   local.get $1
   i32.load offset=12
   i32.lt_s
   if
    local.get $1
    local.get $3
    call $~lib/array/Array<~lib/string/String>#__get
    local.set $4
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.store
    local.get $4
    local.get $0
    call $~lib/string/String.__eq
    if
     local.get $2
     local.get $3
     call $~lib/array/Array<~lib/string/String>#__get
     local.set $0
     global.get $~lib/memory/__stack_pointer
     local.tee $1
     local.get $0
     i32.store
     local.get $1
     i32.const 4
     i32.add
     global.set $~lib/memory/__stack_pointer
     local.get $0
     return
    end
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  i32.const 1744
 )
 (func $assembly/index/getCommands (result i32)
  (local $0 i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.tee $0
  i64.const 0
  i64.store
  local.get $0
  i32.const 7
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
  local.tee $0
  i32.store
  i32.const 2
  i32.const 4
  i32.const 3184
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 0
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 3376
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 1
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 3536
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 2
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 3696
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 3
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 3824
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 4
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 3984
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 5
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  i32.const 2
  i32.const 4
  i32.const 4128
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  i32.const 6
  local.get $1
  call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/date/stringify (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   local.tee $3
   i64.const 0
   i64.store
   local.get $3
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   block $__inlined_func$~lib/util/number/itoa32
    local.get $0
    i32.eqz
    if
     global.get $~lib/memory/__stack_pointer
     i32.const 4
     i32.add
     global.set $~lib/memory/__stack_pointer
     i32.const 6624
     local.set $0
     br $__inlined_func$~lib/util/number/itoa32
    end
    global.get $~lib/memory/__stack_pointer
    i32.const 0
    local.get $0
    i32.sub
    local.get $0
    local.get $0
    i32.const 31
    i32.shr_u
    i32.const 1
    i32.shl
    local.tee $3
    select
    local.tee $4
    i32.const 100000
    i32.lt_u
    if (result i32)
     local.get $4
     i32.const 100
     i32.lt_u
     if (result i32)
      local.get $4
      i32.const 10
      i32.ge_u
      i32.const 1
      i32.add
     else
      local.get $4
      i32.const 10000
      i32.ge_u
      i32.const 3
      i32.add
      local.get $4
      i32.const 1000
      i32.ge_u
      i32.add
     end
    else
     local.get $4
     i32.const 10000000
     i32.lt_u
     if (result i32)
      local.get $4
      i32.const 1000000
      i32.ge_u
      i32.const 6
      i32.add
     else
      local.get $4
      i32.const 1000000000
      i32.ge_u
      i32.const 8
      i32.add
      local.get $4
      i32.const 100000000
      i32.ge_u
      i32.add
     end
    end
    local.tee $5
    i32.const 1
    i32.shl
    local.get $3
    i32.add
    i32.const 1
    call $~lib/rt/itcms/__new
    local.tee $0
    i32.store
    local.get $0
    local.get $3
    i32.add
    local.get $4
    local.get $5
    call $~lib/util/number/utoa32_dec_lut
    local.get $3
    if
     local.get $0
     i32.const 45
     i32.store16
    end
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   local.tee $3
   local.get $0
   i32.store
   local.get $3
   i32.const 6624
   i32.store offset=4
   local.get $3
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   block $__inlined_func$~lib/string/String#padStart
    i32.const 6620
    i32.load
    i32.const 1
    i32.shr_u
    i32.const 1
    i32.shl
    local.tee $4
    i32.eqz
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.const 1
    i32.shl
    local.tee $5
    local.get $1
    i32.const 1
    i32.shl
    local.tee $3
    i32.gt_u
    i32.or
    if
     global.get $~lib/memory/__stack_pointer
     i32.const 4
     i32.add
     global.set $~lib/memory/__stack_pointer
     br $__inlined_func$~lib/string/String#padStart
    end
    global.get $~lib/memory/__stack_pointer
    local.get $3
    i32.const 1
    call $~lib/rt/itcms/__new
    local.tee $1
    i32.store
    local.get $3
    local.get $5
    i32.sub
    local.tee $6
    local.get $4
    i32.gt_u
    if
     local.get $6
     local.get $6
     i32.const 2
     i32.sub
     local.get $4
     i32.div_u
     local.get $4
     i32.mul
     local.tee $3
     i32.sub
     local.set $7
     loop $while-continue|0
      local.get $2
      local.get $3
      i32.lt_u
      if
       local.get $1
       local.get $2
       i32.add
       i32.const 6624
       local.get $4
       memory.copy
       local.get $2
       local.get $4
       i32.add
       local.set $2
       br $while-continue|0
      end
     end
     local.get $1
     local.get $3
     i32.add
     i32.const 6624
     local.get $7
     memory.copy
    else
     local.get $1
     i32.const 6624
     local.get $6
     memory.copy
    end
    local.get $1
    local.get $6
    i32.add
    local.get $0
    local.get $5
    memory.copy
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
    local.get $1
    local.set $0
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $~lib/date/Date#toISOString (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i64)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 48
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $4
   i32.const 0
   i32.const 48
   memory.fill
   i32.const 28
   i32.const 9
   call $~lib/rt/itcms/__new
   local.tee $5
   i32.const 8272
   i32.const 28
   memory.copy
   local.get $4
   local.get $5
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.set $4
   i32.const 48
   i32.const 9
   call $~lib/rt/itcms/__new
   local.tee $6
   i32.const 8704
   i32.const 48
   memory.copy
   local.get $4
   local.get $6
   i32.store offset=4
   local.get $0
   i32.load
   local.tee $4
   local.get $0
   i32.load offset=4
   local.tee $7
   i32.const 3
   i32.lt_s
   i32.sub
   local.tee $8
   i32.const 0
   i32.lt_s
   local.set $9
   local.get $7
   i32.const 8763
   i32.add
   i32.load8_u
   local.get $8
   i32.const 3
   i32.const 0
   local.get $9
   select
   i32.sub
   i32.const 4
   i32.div_s
   local.get $8
   i32.const 99
   i32.const 0
   local.get $9
   select
   i32.sub
   i32.const 100
   i32.div_s
   i32.sub
   local.get $8
   i32.const 399
   i32.const 0
   local.get $9
   select
   i32.sub
   i32.const 400
   i32.div_s
   i32.add
   local.get $8
   i32.add
   i32.add
   local.get $0
   i32.load offset=8
   local.tee $8
   i32.add
   i32.const 7
   i32.rem_s
   local.set $9
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.const 31
   i32.shr_s
   local.tee $10
   local.get $4
   i32.add
   local.get $10
   i32.xor
   i32.const 4
   call $~lib/date/stringify
   local.tee $10
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $6
   local.get $7
   i32.const 1
   i32.sub
   i32.const 2
   i32.shl
   i32.add
   i32.load
   local.tee $6
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $5
   local.get $9
   i32.const 7
   i32.const 0
   local.get $9
   i32.const 0
   i32.lt_s
   select
   i32.add
   i32.const 2
   i32.shl
   i32.add
   i32.load
   local.tee $5
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $8
   i32.const 2
   call $~lib/date/stringify
   local.tee $7
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i64.load offset=16
   i64.const 86400000
   i64.rem_s
   local.tee $3
   i64.const 86400000
   i64.const 0
   local.get $3
   i64.const 0
   i64.lt_s
   select
   i64.add
   i32.wrap_i64
   i32.const 3600000
   i32.div_s
   i32.const 2
   call $~lib/date/stringify
   local.tee $8
   i32.store offset=24
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i64.load offset=16
   i64.const 3600000
   i64.rem_s
   local.tee $3
   i64.const 3600000
   i64.const 0
   local.get $3
   i64.const 0
   i64.lt_s
   select
   i64.add
   i32.wrap_i64
   i32.const 60000
   i32.div_s
   i32.const 2
   call $~lib/date/stringify
   local.tee $9
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i64.load offset=16
   i64.const 60000
   i64.rem_s
   local.tee $3
   i64.const 60000
   i64.const 0
   local.get $3
   i64.const 0
   i64.lt_s
   select
   i64.add
   i32.wrap_i64
   i32.const 1000
   i32.div_s
   i32.const 2
   call $~lib/date/stringify
   local.tee $0
   i32.store offset=32
   global.get $~lib/memory/__stack_pointer
   i32.const 8912
   i32.const 1744
   local.get $4
   i32.const 0
   i32.lt_s
   select
   local.tee $4
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 0
   local.get $5
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 1
   local.get $7
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 2
   local.get $6
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 3
   local.get $4
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 4
   local.get $10
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 6
   local.get $8
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 8
   local.get $9
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   i32.const 10
   local.get $0
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 8832
   i32.store offset=40
   global.get $~lib/memory/__stack_pointer
   i32.const 1744
   i32.store offset=44
   i32.const 8828
   i32.load
   i32.const 2
   i32.shr_u
   local.set $4
   i32.const 0
   local.set $0
   global.get $~lib/memory/__stack_pointer
   i32.const 12
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $5
   i64.const 0
   i64.store
   local.get $5
   i32.const 0
   i32.store offset=8
   block $__inlined_func$~lib/util/string/joinStringArray
    local.get $4
    i32.const 1
    i32.sub
    local.tee $5
    i32.const 0
    i32.lt_s
    if
     global.get $~lib/memory/__stack_pointer
     i32.const 12
     i32.add
     global.set $~lib/memory/__stack_pointer
     i32.const 1744
     local.set $0
     br $__inlined_func$~lib/util/string/joinStringArray
    end
    local.get $5
    i32.eqz
    if
     global.get $~lib/memory/__stack_pointer
     local.tee $0
     i32.const 8832
     i32.load
     local.tee $1
     i32.store
     local.get $0
     i32.const 12
     i32.add
     global.set $~lib/memory/__stack_pointer
     local.get $1
     i32.const 1744
     local.get $1
     select
     local.set $0
     br $__inlined_func$~lib/util/string/joinStringArray
    end
    loop $for-loop|0
     local.get $2
     local.get $4
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $2
      i32.const 2
      i32.shl
      i32.const 8832
      i32.add
      i32.load
      local.tee $6
      i32.store offset=4
      local.get $6
      if
       local.get $0
       local.get $6
       i32.const 20
       i32.sub
       i32.load offset=16
       i32.const 1
       i32.shr_u
       i32.add
       local.set $0
      end
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      br $for-loop|0
     end
    end
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.const 1740
    i32.load
    i32.const 1
    i32.shr_u
    local.tee $4
    local.get $5
    i32.mul
    i32.add
    i32.const 1
    i32.shl
    i32.const 1
    call $~lib/rt/itcms/__new
    local.tee $0
    i32.store offset=8
    i32.const 0
    local.set $2
    loop $for-loop|1
     local.get $2
     local.get $5
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $2
      i32.const 2
      i32.shl
      i32.const 8832
      i32.add
      i32.load
      local.tee $6
      i32.store offset=4
      local.get $6
      if
       local.get $0
       local.get $1
       i32.const 1
       i32.shl
       i32.add
       local.get $6
       local.get $6
       i32.const 20
       i32.sub
       i32.load offset=16
       i32.const 1
       i32.shr_u
       local.tee $6
       i32.const 1
       i32.shl
       memory.copy
       local.get $1
       local.get $6
       i32.add
       local.set $1
      end
      local.get $4
      if
       local.get $0
       local.get $1
       i32.const 1
       i32.shl
       i32.add
       i32.const 1744
       local.get $4
       i32.const 1
       i32.shl
       memory.copy
       local.get $1
       local.get $4
       i32.add
       local.set $1
      end
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      br $for-loop|1
     end
    end
    global.get $~lib/memory/__stack_pointer
    local.get $5
    i32.const 2
    i32.shl
    i32.const 8832
    i32.add
    i32.load
    local.tee $2
    i32.store offset=4
    local.get $2
    if
     local.get $0
     local.get $1
     i32.const 1
     i32.shl
     i32.add
     local.get $2
     local.get $2
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.const 1
     i32.shr_u
     i32.const 1
     i32.shl
     memory.copy
    end
    global.get $~lib/memory/__stack_pointer
    i32.const 12
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 48
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/onUpdate (result i32)
  (local $0 i32)
  (local $1 i64)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.const 20
   memory.fill
   local.get $0
   i32.const 1
   i32.const 6
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $2
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.load offset=4
   i32.store offset=12
   local.get $2
   i32.const 0
   i32.const 7904
   call $~lib/array/Array<~lib/string/String>#__uset
   call $~lib/bindings/dom/Date.now
   i64.trunc_sat_f64_s
   local.set $1
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.store
   local.get $0
   i32.const 24
   i32.const 8
   call $~lib/rt/itcms/__new
   local.tee $6
   i32.store
   local.get $6
   local.get $1
   i64.store offset=16
   local.get $6
   i32.const 0
   i32.store
   local.get $6
   i32.const 0
   i32.store offset=4
   local.get $6
   i32.const 0
   i32.store offset=8
   local.get $1
   i64.const -8640000000000000
   i64.lt_s
   local.get $1
   i64.const 8640000000000000
   i64.gt_s
   i32.or
   if
    i32.const 7952
    i32.const 8000
    i32.const 100
    i32.const 35
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   i64.const 86399999
   i64.const 0
   local.get $1
   i64.const 0
   i64.lt_s
   select
   i64.sub
   i64.const 86400000
   i64.div_s
   i32.wrap_i64
   i32.const 2
   i32.shl
   i32.const 2877872
   i32.add
   i32.const 3
   i32.or
   local.tee $0
   i32.const 146096
   i32.const 0
   local.get $0
   i32.const 0
   i32.lt_s
   select
   i32.sub
   i32.const 146097
   i32.div_s
   local.set $7
   local.get $0
   local.get $7
   i32.const 146097
   i32.mul
   i32.sub
   i32.const 3
   i32.or
   i64.extend_i32_u
   i64.const 2939745
   i64.mul
   local.tee $1
   i32.wrap_i64
   i32.const 11758980
   i32.div_u
   local.tee $5
   i32.const 2141
   i32.mul
   i32.const 197913
   i32.add
   local.set $4
   local.get $1
   i64.const 32
   i64.shr_u
   i32.wrap_i64
   local.get $7
   i32.const 100
   i32.mul
   i32.add
   local.set $0
   local.get $4
   i32.const 16
   i32.shr_u
   local.set $7
   local.get $4
   i32.const 65535
   i32.and
   i32.const 2141
   i32.div_u
   i32.const 1
   i32.add
   global.set $~lib/date/_day
   local.get $5
   i32.const 306
   i32.ge_u
   if (result i32)
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    local.get $7
    i32.const 12
    i32.sub
   else
    local.get $7
   end
   global.set $~lib/date/_month
   local.get $6
   local.get $0
   i32.store
   local.get $6
   global.get $~lib/date/_month
   i32.store offset=4
   local.get $6
   global.get $~lib/date/_day
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.store offset=16
   local.get $2
   i32.const 1
   local.get $6
   call $~lib/date/Date#toISOString
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $3
   i32.const 0
   local.get $2
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 20
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $3
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.tee $1
  i64.const 0
  i64.store
  local.get $1
  i32.const 16
  i32.const 6
  call $~lib/rt/itcms/__new
  local.tee $2
  i32.store
  local.get $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 268435455
  i32.gt_u
  if
   i32.const 1488
   i32.const 1536
   i32.const 70
   i32.const 60
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.const 8
  local.get $0
  i32.const 8
  i32.gt_u
  select
  i32.const 2
  i32.shl
  local.tee $1
  i32.const 0
  call $~lib/rt/itcms/__new
  local.tee $3
  i32.store offset=4
  local.get $2
  local.get $3
  i32.store
  local.get $3
  if
   local.get $2
   local.get $3
   i32.const 0
   call $byn-split-outlined-A$~lib/rt/itcms/__link
  end
  local.get $2
  local.get $3
  i32.store offset=4
  local.get $2
  local.get $1
  i32.store offset=8
  local.get $2
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $2
 )
 (func $~lib/array/Array<~lib/string/String>#__get (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 1152
   i32.const 1536
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.tee $0
  i32.store
  local.get $0
  i32.eqz
  if
   i32.const 1616
   i32.const 1536
   i32.const 118
   i32.const 40
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/rt/__newArray (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.tee $5
  i32.const 0
  i32.store
  local.get $0
  i32.const 2
  i32.shl
  local.tee $4
  i32.const 0
  call $~lib/rt/itcms/__new
  local.set $3
  local.get $2
  if
   local.get $3
   local.get $2
   local.get $4
   memory.copy
  end
  local.get $5
  local.get $3
  i32.store
  i32.const 16
  local.get $1
  call $~lib/rt/itcms/__new
  local.tee $1
  local.get $3
  i32.store
  local.get $3
  if
   local.get $1
   local.get $3
   i32.const 0
   call $byn-split-outlined-A$~lib/rt/itcms/__link
  end
  local.get $1
  local.get $3
  i32.store offset=4
  local.get $1
  local.get $4
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $1
 )
 (func $~lib/util/number/itoa64 (param $0 i64) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  local.get $0
  i64.eqz
  if
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   i32.const 6624
   return
  end
  i64.const 0
  local.get $0
  i64.sub
  local.get $0
  local.get $0
  i64.const 63
  i64.shr_u
  i32.wrap_i64
  i32.const 1
  i32.shl
  local.tee $2
  select
  local.tee $0
  i64.const 4294967295
  i64.le_u
  if
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.wrap_i64
   local.tee $1
   i32.const 100000
   i32.lt_u
   if (result i32)
    local.get $1
    i32.const 100
    i32.lt_u
    if (result i32)
     local.get $1
     i32.const 10
     i32.ge_u
     i32.const 1
     i32.add
    else
     local.get $1
     i32.const 10000
     i32.ge_u
     i32.const 3
     i32.add
     local.get $1
     i32.const 1000
     i32.ge_u
     i32.add
    end
   else
    local.get $1
    i32.const 10000000
    i32.lt_u
    if (result i32)
     local.get $1
     i32.const 1000000
     i32.ge_u
     i32.const 6
     i32.add
    else
     local.get $1
     i32.const 1000000000
     i32.ge_u
     i32.const 8
     i32.add
     local.get $1
     i32.const 100000000
     i32.ge_u
     i32.add
    end
   end
   local.tee $4
   i32.const 1
   i32.shl
   local.get $2
   i32.add
   i32.const 1
   call $~lib/rt/itcms/__new
   local.tee $3
   i32.store
   local.get $2
   local.get $3
   i32.add
   local.get $1
   local.get $4
   call $~lib/util/number/utoa32_dec_lut
  else
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i64.const 1000000000000000
   i64.lt_u
   if (result i32)
    local.get $0
    i64.const 1000000000000
    i64.lt_u
    if (result i32)
     local.get $0
     i64.const 100000000000
     i64.ge_u
     i32.const 10
     i32.add
     local.get $0
     i64.const 10000000000
     i64.ge_u
     i32.add
    else
     local.get $0
     i64.const 100000000000000
     i64.ge_u
     i32.const 13
     i32.add
     local.get $0
     i64.const 10000000000000
     i64.ge_u
     i32.add
    end
   else
    local.get $0
    i64.const 100000000000000000
    i64.lt_u
    if (result i32)
     local.get $0
     i64.const 10000000000000000
     i64.ge_u
     i32.const 16
     i32.add
    else
     local.get $0
     i64.const -8446744073709551616
     i64.ge_u
     i32.const 18
     i32.add
     local.get $0
     i64.const 1000000000000000000
     i64.ge_u
     i32.add
    end
   end
   local.tee $1
   i32.const 1
   i32.shl
   local.get $2
   i32.add
   i32.const 1
   call $~lib/rt/itcms/__new
   local.tee $3
   i32.store
   local.get $2
   local.get $3
   i32.add
   local.set $5
   loop $while-continue|0
    local.get $0
    i64.const 100000000
    i64.ge_u
    if
     local.get $5
     local.get $1
     i32.const 4
     i32.sub
     local.tee $1
     i32.const 1
     i32.shl
     i32.add
     local.get $0
     local.get $0
     i64.const 100000000
     i64.div_u
     local.tee $0
     i64.const 100000000
     i64.mul
     i64.sub
     i32.wrap_i64
     local.tee $4
     i32.const 10000
     i32.rem_u
     local.tee $6
     i32.const 100
     i32.div_u
     i32.const 2
     i32.shl
     i32.const 5976
     i32.add
     i64.load32_u
     local.get $6
     i32.const 100
     i32.rem_u
     i32.const 2
     i32.shl
     i32.const 5976
     i32.add
     i64.load32_u
     i64.const 32
     i64.shl
     i64.or
     i64.store
     local.get $5
     local.get $1
     i32.const 4
     i32.sub
     local.tee $1
     i32.const 1
     i32.shl
     i32.add
     local.get $4
     i32.const 10000
     i32.div_u
     local.tee $4
     i32.const 100
     i32.div_u
     i32.const 2
     i32.shl
     i32.const 5976
     i32.add
     i64.load32_u
     local.get $4
     i32.const 100
     i32.rem_u
     i32.const 2
     i32.shl
     i32.const 5976
     i32.add
     i64.load32_u
     i64.const 32
     i64.shl
     i64.or
     i64.store
     br $while-continue|0
    end
   end
   local.get $5
   local.get $0
   i32.wrap_i64
   local.get $1
   call $~lib/util/number/utoa32_dec_lut
  end
  local.get $2
  if
   local.get $3
   i32.const 45
   i32.store16
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $3
 )
 (func $export:assembly/index/modelFactory (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 20
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 20
   memory.fill
   local.get $2
   i32.const 3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $2
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=12
   local.get $3
   i32.const 0
   i32.const 1584
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 1584
   i32.store offset=16
   local.get $3
   i32.const 1
   i32.const 1584
   local.get $0
   local.get $1
   call $assembly/index/findVal
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=4
   local.get $2
   i32.const 0
   local.get $3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=8
   local.get $3
   i32.const 0
   i32.const 1776
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 1776
   i32.store offset=16
   local.get $3
   i32.const 1
   i32.const 1776
   local.get $0
   local.get $1
   call $assembly/index/findVal
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=4
   local.get $2
   i32.const 1
   local.get $3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=12
   local.get $3
   i32.const 0
   i32.const 1808
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 1808
   i32.store offset=16
   local.get $3
   i32.const 1
   i32.const 1808
   local.get $0
   local.get $1
   call $assembly/index/findVal
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=4
   local.get $2
   i32.const 2
   local.get $3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 20
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $2
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/getPorts (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 8
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i64.const 0
   i64.store
   local.get $0
   i32.const 2
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $0
   i32.store
   i32.const 2
   i32.const 4
   i32.const 2016
   call $~lib/rt/__newArray
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $0
   i32.const 0
   local.get $1
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   i32.const 2
   i32.const 4
   i32.const 2192
   call $~lib/rt/__newArray
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $0
   i32.const 1
   local.get $1
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/port1Cb (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const -64
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.const 64
   memory.fill
   local.get $0
   i32.const 4
   i32.const 6
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.load offset=4
   i32.store offset=4
   local.get $1
   i32.const 0
   i32.const 2
   i32.const 4
   i32.const 2256
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 1
   i32.const 2
   i32.const 4
   i32.const 2384
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 2
   i32.const 2
   i32.const 4
   i32.const 2512
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 3
   i32.const 2
   i32.const 4
   i32.const 2640
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $0
   local.get $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 2672
   i32.store offset=52
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=60
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=56
   i32.const 2672
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=44
   global.get $~lib/memory/__stack_pointer
   i32.const 2720
   i32.store offset=48
   local.get $0
   i32.const 2720
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=36
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=44
   local.get $2
   i32.const 1
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=40
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   i32.const 2720
   i32.store offset=32
   local.get $0
   i32.const 2720
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=20
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=28
   local.get $2
   i32.const 2
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=24
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=20
   local.get $2
   i32.const 3
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=16
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $0
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const -64
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/port2Cb (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const -64
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.const 64
   memory.fill
   local.get $0
   i32.const 4
   i32.const 6
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.load offset=4
   i32.store offset=4
   local.get $1
   i32.const 0
   i32.const 2
   i32.const 4
   i32.const 2752
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 1
   i32.const 2
   i32.const 4
   i32.const 2832
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 2
   i32.const 2
   i32.const 4
   i32.const 2864
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $1
   i32.const 3
   i32.const 2
   i32.const 4
   i32.const 2944
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $0
   local.get $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 2976
   i32.store offset=52
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=60
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=56
   i32.const 2976
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=44
   global.get $~lib/memory/__stack_pointer
   i32.const 2720
   i32.store offset=48
   local.get $0
   i32.const 2720
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=36
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=44
   local.get $2
   i32.const 1
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=40
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   i32.const 2720
   i32.store offset=32
   local.get $0
   i32.const 2720
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=20
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=28
   local.get $2
   i32.const 2
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=24
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=20
   local.get $2
   i32.const 3
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=16
   local.get $0
   local.get $2
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $0
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const -64
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/commandEx (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 32
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 32
   memory.fill
   local.get $2
   i32.const 4160
   i32.store offset=20
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=24
   i32.const 4160
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 4224
   i32.store offset=16
   local.get $0
   i32.const 4224
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   local.get $0
   local.get $1
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 1
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $0
   i32.store offset=28
   i32.const 2
   i32.const 4
   i32.const 4320
   call $~lib/rt/__newArray
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   local.get $0
   i32.const 0
   local.get $1
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 32
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/serviceMeshListen (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 32
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 32
   memory.fill
   local.get $2
   i32.const 4352
   i32.store offset=20
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=24
   i32.const 4352
   local.get $2
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 4416
   i32.store offset=16
   local.get $2
   i32.const 4416
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=4
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $3
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=8
   local.get $2
   local.get $3
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $2
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   local.get $0
   local.get $1
   call $assembly/index/findVal
   local.tee $0
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   i32.const 3408
   i32.store offset=4
   local.get $0
   i32.const 3408
   call $assembly/aegis/addListener
   global.get $~lib/memory/__stack_pointer
   i32.const 32
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/serviceMeshNotify (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 44
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 44
   memory.fill
   local.get $2
   i32.const 4496
   i32.store
   local.get $2
   i32.const 4496
   local.get $0
   local.get $1
   call $assembly/index/findVal
   local.tee $2
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 4544
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4544
   local.get $0
   local.get $1
   call $assembly/index/findVal
   local.tee $3
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   local.get $0
   local.get $1
   call $assembly/index/findVal
   local.tee $4
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $5
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   i32.const 4592
   i32.store offset=32
   i32.const 4592
   local.get $2
   call $~lib/string/String.__concat
   local.set $6
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.store offset=24
   global.get $~lib/memory/__stack_pointer
   i32.const 4416
   i32.store offset=28
   local.get $6
   i32.const 4416
   call $~lib/string/String.__concat
   local.set $6
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.store offset=20
   local.get $6
   local.get $3
   call $~lib/string/String.__concat
   local.set $6
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.store
   local.get $6
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $6
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.load offset=4
   i32.store offset=40
   local.get $6
   i32.const 0
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $6
   i32.const 1
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $6
   i32.store offset=24
   local.get $5
   i32.const 0
   local.get $6
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $0
   i32.store offset=40
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=4
   i32.store offset=36
   local.get $0
   i32.const 0
   i32.const 4496
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $0
   i32.const 1
   local.get $2
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=24
   local.get $5
   i32.const 1
   local.get $0
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $0
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=4
   i32.store offset=40
   local.get $0
   i32.const 0
   i32.const 4544
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $0
   i32.const 1
   local.get $3
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=24
   local.get $5
   i32.const 2
   local.get $0
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.const 4672
   local.get $4
   select
   local.tee $0
   i32.store
   local.get $0
   local.get $5
   f64.const 1
   call $assembly/aegis/fireEvent
   global.get $~lib/memory/__stack_pointer
   i32.const 44
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/serviceMeshCallback (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 44
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 44
   memory.fill
   local.get $2
   i32.const 4720
   i32.store offset=20
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=24
   i32.const 4720
   local.get $2
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 4416
   i32.store offset=16
   local.get $2
   i32.const 4416
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=4
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $3
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=8
   local.get $2
   local.get $3
   call $~lib/string/String.__concat
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $2
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4448
   local.get $0
   local.get $1
   call $assembly/index/findVal
   local.tee $2
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $3
   i32.store offset=32
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $4
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.load offset=4
   i32.store offset=40
   local.get $4
   i32.const 0
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $4
   i32.const 1
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=8
   local.get $3
   i32.const 0
   local.get $4
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $4
   i32.store offset=40
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.load offset=4
   i32.store offset=36
   local.get $4
   i32.const 0
   local.get $0
   i32.const 1
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $4
   i32.const 1
   local.get $1
   i32.const 1
   call $~lib/array/Array<~lib/string/String>#__get
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=8
   local.get $3
   i32.const 1
   local.get $4
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2288
   i32.store offset=8
   local.get $2
   i32.const 2288
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   local.get $3
   f64.const 1
   call $assembly/aegis/fireEvent
   global.get $~lib/memory/__stack_pointer
   i32.const 1
   i32.const 6
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $0
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=4
   i32.store offset=40
   local.get $0
   i32.const 0
   i32.const 2
   i32.const 4
   i32.const 4800
   call $~lib/rt/__newArray
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 44
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/runFibonacci (param $0 i32) (param $1 i32) (result i32)
  (local $2 f64)
  (local $3 i32)
  (local $4 i64)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $5
   local.get $0
   i32.store
   local.get $5
   local.get $1
   i32.store offset=4
   local.get $5
   i32.const 24
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.const 24
   memory.fill
   call $~lib/bindings/dom/Date.now
   i64.trunc_sat_f64_s
   local.set $4
   loop $for-loop|0
    local.get $3
    local.get $0
    i32.load offset=12
    i32.lt_s
    if
     block $for-break0
      global.get $~lib/memory/__stack_pointer
      i32.const 1808
      i32.store
      local.get $0
      local.get $3
      call $~lib/array/Array<~lib/string/String>#__get
      local.set $5
      global.get $~lib/memory/__stack_pointer
      local.get $5
      i32.store offset=4
      i32.const 1808
      local.get $5
      call $~lib/string/String.__eq
      if
       local.get $1
       local.get $3
       call $~lib/array/Array<~lib/string/String>#__get
       local.set $0
       global.get $~lib/memory/__stack_pointer
       local.get $0
       i32.store
       local.get $0
       call $~lib/util/string/strtol<f64>
       local.set $2
       br $for-break0
      end
      local.get $3
      i32.const 1
      i32.add
      local.set $3
      br $for-loop|0
     end
    end
   end
   local.get $2
   call $assembly/index/fibonacci
   local.set $2
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $1
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=20
   local.get $3
   i32.const 0
   i32.const 4832
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   block $__inlined_func$~lib/util/number/dtoa
    local.get $2
    f64.const 0
    f64.eq
    if
     global.get $~lib/memory/__stack_pointer
     i32.const 4
     i32.add
     global.set $~lib/memory/__stack_pointer
     i32.const 4864
     local.set $0
     br $__inlined_func$~lib/util/number/dtoa
    end
    local.get $2
    local.get $2
    f64.sub
    f64.const 0
    f64.ne
    if
     local.get $2
     local.get $2
     f64.ne
     if
      global.get $~lib/memory/__stack_pointer
      i32.const 4
      i32.add
      global.set $~lib/memory/__stack_pointer
      i32.const 4896
      local.set $0
      br $__inlined_func$~lib/util/number/dtoa
     end
     global.get $~lib/memory/__stack_pointer
     i32.const 4
     i32.add
     global.set $~lib/memory/__stack_pointer
     i32.const 4928
     i32.const 4976
     local.get $2
     f64.const 0
     f64.lt
     select
     local.set $0
     br $__inlined_func$~lib/util/number/dtoa
    end
    local.get $2
    call $~lib/util/number/dtoa_core
    i32.const 1
    i32.shl
    local.set $5
    global.get $~lib/memory/__stack_pointer
    local.get $5
    i32.const 1
    call $~lib/rt/itcms/__new
    local.tee $0
    i32.store
    local.get $0
    i32.const 5008
    local.get $5
    memory.copy
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   local.get $3
   i32.const 1
   local.get $0
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=12
   local.get $1
   i32.const 0
   local.get $3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $0
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=4
   i32.store offset=16
   local.get $0
   i32.const 0
   i32.const 6400
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $0
   i32.const 1
   call $~lib/bindings/dom/Date.now
   i64.trunc_sat_f64_s
   local.get $4
   i64.sub
   call $~lib/util/number/itoa64
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   local.get $1
   i32.const 1
   local.get $0
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 24
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/portEx (param $0 i32) (param $1 i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 28
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 28
   memory.fill
   local.get $2
   i32.const 7808
   i32.store offset=20
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=24
   i32.const 7808
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 4224
   i32.store offset=16
   local.get $0
   i32.const 4224
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   local.get $0
   local.get $1
   call $~lib/string/String.__concat
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 28
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/onUpdate (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 9492
  i32.lt_s
  if
   i32.const 25904
   i32.const 25952
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.tee $2
  local.get $0
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  call $assembly/index/onUpdate
  local.set $0
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $export:assembly/index/onDelete (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.store
   local.get $0
   i32.const 8944
   i32.store
   i32.const 8944
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   i32.const -1
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/validate (param $0 i32) (param $1 i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $0
   i32.const 0
   i32.store
   local.get $0
   i32.const 9008
   i32.store
   i32.const 9008
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $export:assembly/index/test (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   local.get $0
   i32.store
   local.get $2
   local.get $1
   i32.store offset=4
   local.get $2
   i32.const 32
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 9492
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.tee $2
   i32.const 0
   i32.const 32
   memory.fill
   local.get $0
   i32.const 0
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $3
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 1584
   i32.store offset=4
   local.get $2
   local.get $3
   i32.const 1584
   call $~lib/string/String.__eq
   if (result i32)
    local.get $1
    i32.const 0
    call $~lib/array/Array<~lib/string/String>#__get
   else
    i32.const 9072
   end
   local.tee $2
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.set $3
   local.get $0
   i32.const 1
   call $~lib/array/Array<~lib/string/String>#__get
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 1776
   i32.store offset=4
   local.get $3
   local.get $0
   i32.const 1776
   call $~lib/string/String.__eq
   if (result i32)
    local.get $1
    i32.const 1
    call $~lib/array/Array<~lib/string/String>#__get
   else
    i32.const 9072
   end
   local.tee $0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   i32.const 3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#constructor
   local.tee $1
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $3
   i32.store offset=24
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   i32.store offset=28
   local.get $3
   i32.const 0
   i32.const 1584
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $3
   i32.const 1
   local.get $2
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=20
   local.get $1
   i32.const 0
   local.get $3
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 2
   i32.const 4
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $2
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.load offset=4
   i32.store offset=24
   local.get $2
   i32.const 0
   i32.const 1776
   call $~lib/array/Array<~lib/string/String>#__uset
   local.get $2
   i32.const 1
   local.get $0
   call $~lib/array/Array<~lib/string/String>#__uset
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=20
   local.get $1
   i32.const 1
   local.get $2
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   i32.const 2
   i32.const 4
   i32.const 9216
   call $~lib/rt/__newArray
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=20
   local.get $1
   i32.const 2
   local.get $0
   call $~lib/array/Array<~lib/array/Array<~lib/string/String>>#__set
   global.get $~lib/memory/__stack_pointer
   i32.const 9248
   i32.store
   i32.const 9248
   call $assembly/aegis/log
   global.get $~lib/memory/__stack_pointer
   i32.const 32
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 25904
  i32.const 25952
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $byn-split-outlined-A$~lib/rt/itcms/__visit (param $0 i32)
  global.get $~lib/rt/itcms/white
  local.get $0
  i32.const 20
  i32.sub
  local.tee $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   call $~lib/rt/itcms/Object#makeGray
   global.get $~lib/rt/itcms/visitCount
   i32.const 1
   i32.add
   global.set $~lib/rt/itcms/visitCount
  end
 )
 (func $byn-split-outlined-A$~lib/rt/itcms/__link (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $0
  i32.eqz
  if
   i32.const 0
   i32.const 1056
   i32.const 294
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/white
  local.get $1
  i32.const 20
  i32.sub
  local.tee $1
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $0
   i32.load offset=4
   i32.const 3
   i32.and
   local.tee $3
   global.get $~lib/rt/itcms/white
   i32.eqz
   i32.eq
   if
    local.get $0
    local.get $1
    local.get $2
    select
    call $~lib/rt/itcms/Object#makeGray
   else
    global.get $~lib/rt/itcms/state
    i32.const 1
    i32.eq
    local.get $3
    i32.const 3
    i32.eq
    i32.and
    if
     local.get $1
     call $~lib/rt/itcms/Object#makeGray
    end
   end
  end
 )
)

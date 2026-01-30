# Spec IL Grammar

## EBNF Definition

```ebnf
(* Top level *)
spec_file     = { node | comment } ;
node          = "(" , "node" , name , sections , ")" ;
sections      = sig , inv , [ deps ] , [ witness ] ;

(* Signature *)
sig           = "(" , "sig" , type_expr , "->" , type_expr , ")" ;

(* Type expressions *)
type_expr     = primitive
              | generic
              | list_type
              | option_type  
              | tuple_type
              | union_type
              | fn_type
              | constrained ;

primitive     = "bool" | "nat" | "int" | "bytes" | "str" | "unit" ;
generic       = upper_ident ;
list_type     = "[" , type_expr , "]" ;
option_type   = type_expr , "?" ;
tuple_type    = "(" , type_expr , type_expr , { type_expr } , ")" ;
union_type    = type_expr , "|" , type_expr ;
fn_type       = type_expr , "->" , type_expr ;
constrained   = type_expr , ":" , constraint , { constraint } ;
constraint    = "Ord" | "Eq" | "Hash" | "Copy" | "Default" ;

(* Invariants *)
inv           = "(" , "inv" , invariant , { invariant } , ")" ;
invariant     = quantifier | relation | logic | call ;

quantifier    = "(" , ( "forall" | "exists" ) , "(" , var , { var } , ")" , invariant , ")" ;

relation      = "(" , rel_op , expr , expr , ")" ;
rel_op        = "=" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "subset" ;

logic         = "(" , logic_op , invariant , { invariant } , ")" ;
logic_op      = "and" | "or" | "not" | "implies" | "iff" ;

call          = "(" , name , { expr } , ")" ;

(* Expressions *)
expr          = var
              | literal
              | call
              | arith
              | access ;

arith         = "(" , arith_op , expr , { expr } , ")" ;
arith_op      = "+" | "-" | "*" | "/" | "mod" | "len" | "abs" | "min" | "max" ;

access        = "(" , "at" , expr , expr , ")"         (* index access *)
              | "(" , "slice" , expr , expr , expr , ")" (* slice *)
              | "(" , "field" , expr , name , ")" ;    (* field access *)

(* Literals *)
literal       = number | string | bytes_lit | bool_lit | list_lit | none_lit | some_lit ;
number        = [ "-" ] , digit , { digit } ;
string        = '"' , { any_char - '"' } , '"' ;
bytes_lit     = "#x" , hex_digit , { hex_digit } ;
bool_lit      = "true" | "false" ;
list_lit      = "[" , [ literal , { literal } ] , "]" ;
none_lit      = "none" ;
some_lit      = "(" , "some" , literal , ")" ;

(* Dependencies *)
deps          = "(" , "deps" , "[" , { name } , "]" , ")" ;

(* Witnesses *)
witness       = "(" , "witness" , { example } , ")" ;
example       = "(" , { literal } , ")" ;

(* Identifiers *)
name          = lower_ident | lower_ident , { "_" , ( lower_ident | digit ) } ;
var           = lower_ident ;
lower_ident   = lower , { lower | digit } ;
upper_ident   = upper , { upper | lower | digit } ;

(* Character classes *)
lower         = "a" | "b" | ... | "z" ;
upper         = "A" | "B" | ... | "Z" ;
digit         = "0" | "1" | ... | "9" ;
hex_digit     = digit | "a" | "b" | "c" | "d" | "e" | "f" 
                      | "A" | "B" | "C" | "D" | "E" | "F" ;
any_char      = ? any unicode character ? ;

(* Comments *)
comment       = ";" , { any_char - newline } , newline ;
newline       = "\n" ;
```

## Reserved Words

```
node sig inv deps witness
forall exists
and or not implies iff
true false none some
bool nat int bytes str unit
at slice field len abs min max mod
Ord Eq Hash Copy Default
```

## Operator Precedence

From lowest to highest:
1. `implies`, `iff` (logical implication)
2. `or` (logical disjunction)
3. `and` (logical conjunction)
4. `not` (logical negation)
5. `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `subset` (relations)
6. `+`, `-` (additive)
7. `*`, `/`, `mod` (multiplicative)
8. Function application

## Type System

### Primitive Types

| Type | Description | Values |
|------|-------------|--------|
| `bool` | Boolean | `true`, `false` |
| `nat` | Natural number | 0, 1, 2, ... |
| `int` | Integer | ..., -2, -1, 0, 1, 2, ... |
| `bytes` | Byte sequence | `#x00`, `#xff`, `#x48656c6c6f` |
| `str` | Unicode string | `"hello"`, `"世界"` |
| `unit` | Unit type | `()` |

### Compound Types

| Syntax | Description | Example |
|--------|-------------|---------|
| `[T]` | List of T | `[1 2 3]`, `["a" "b"]` |
| `T?` | Optional T | `none`, `(some 42)` |
| `(T U)` | Tuple | `(1 "a")`, `(true 0 "x")` |
| `T\|U` | Union | `int\|str` |
| `T -> U` | Function | `nat -> bool` |
| `T:C` | Constrained | `T:Ord`, `T:Eq:Hash` |

### Type Variables

Upper-case identifiers are type variables:
- `T`, `U`, `V` - unconstrained
- `T:Ord` - must be orderable
- `T:Eq` - must be equatable

## Semantic Rules

### Well-Formedness

1. Every `node` must have exactly one `sig` and one `inv`
2. All type variables in `sig` must be universally quantified
3. All referenced nodes must exist or be listed in `deps`
4. No circular dependencies (DAG structure)

### Invariant Satisfaction

A witness `(in1 in2 ... out)` satisfies invariants if:
- Substituting `in`, `out` (or named params) makes all invariants true
- Type constraints are respected

### Witness Requirements

- At least 3 witnesses per node (recommended)
- Must include: empty/zero case, typical case, boundary case
- For partial functions: both success and failure cases

## Examples

### Identity Function
```lisp
(node identity
  (sig (T) -> T)
  (inv (= out in))
  (witness
    (0 0)
    ("hello" "hello")
    ([] [])))
```

### Safe Division
```lisp
(node safe_div
  (sig (int int) -> int?)
  (inv
    (implies (= b 0) (= out none))
    (implies (!= b 0) (= out (some (/ a b)))))
  (witness
    (10 2 (some 5))
    (10 0 none)
    (7 3 (some 2))
    (-10 2 (some -5))))
```

### List Reversal
```lisp
(node reverse
  (sig ([T]) -> [T])
  (inv
    (= (len out) (len in))
    (forall (i)
      (implies (and (>= i 0) (< i (len in)))
        (= (at out i) (at in (- (- (len in) 1) i))))))
  (witness
    ([] [])
    ([1] [1])
    ([1 2 3] [3 2 1])))
```

### HMAC (Keyed Hash)
```lisp
(node hmac_sha1
  (sig (bytes bytes) -> bytes)
  (inv
    ; Output is always 20 bytes (SHA1 output size)
    (= (len out) 20)
    ; Deterministic
    (forall (k m) (= (hmac_sha1 k m) (hmac_sha1 k m))))
  (deps [sha1])
  (witness
    ; RFC 2104 test vector
    (#x0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b
     #x4869205468657265
     #xb617318655057264e28bc0b6fb378c8ef146be00)))
```

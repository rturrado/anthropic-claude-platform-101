<!-- Source: https://github.com/golang/go/blob/master/doc/go_spec.html
     License: Creative Commons Attribution 3.0 (https://go.dev/copyright)
     Extract of the "Statements" section, vendored unmodified as reference
     material for a prompt caching demo. -->

## Statements

Statements control execution.

    Statement  = Declaration | LabeledStmt | SimpleStmt |
                 GoStmt | ReturnStmt | BreakStmt | ContinueStmt | GotoStmt |
                 FallthroughStmt | Block | IfStmt | SwitchStmt | SelectStmt | ForStmt |
                 DeferStmt .

    SimpleStmt = EmptyStmt | ExpressionStmt | SendStmt | IncDecStmt | Assignment | ShortVarDecl .

### Terminating statements

A *terminating statement* interrupts the regular flow of control in a [block](#Blocks). The following statements are terminating:

1.  A ["return"](#Return_statements) or ["goto"](#Goto_statements) statement.
2.  A call to the built-in function [`panic`](#Handling_panics).
3.  A [block](#Blocks) in which the statement list ends in a terminating statement.
4.  An ["if" statement](#If_statements) in which:
    -   the "else" branch is present, and
    -   both branches are terminating statements.
5.  A ["for" statement](#For_statements) in which:
    -   there are no "break" statements referring to the "for" statement, and
    -   the loop condition is absent, and
    -   the "for" statement does not use a range clause.
6.  A ["switch" statement](#Switch_statements) in which:
    -   there are no "break" statements referring to the "switch" statement,
    -   there is a default case, and
    -   the statement lists in each case, including the default, end in a terminating statement, or a possibly labeled ["fallthrough" statement](#Fallthrough_statements).
7.  A ["select" statement](#Select_statements) in which:
    -   there are no "break" statements referring to the "select" statement, and
    -   the statement lists in each case, including the default if present, end in a terminating statement.
8.  A [labeled statement](#Labeled_statements) labeling a terminating statement.

All other statements are not terminating.

A [statement list](#Blocks) ends in a terminating statement if the list is not empty and its final non-empty statement is terminating.

### Empty statements

The empty statement does nothing.

    EmptyStmt = .

### Labeled statements

A labeled statement may be the target of a `goto`, `break` or `continue` statement.

    LabeledStmt = Label ":" Statement .
    Label       = identifier .

    Error: log.Panic("error encountered")

### Expression statements

With the exception of specific built-in functions, function and method [calls](#Calls) and [receive operations](#Receive_operator) can appear in statement context. Such statements may be parenthesized.

    ExpressionStmt = Expression .

The following built-in functions are not permitted in statement context:

    append cap complex imag len make max min new real
    unsafe.Add unsafe.Alignof unsafe.Offsetof unsafe.Sizeof unsafe.Slice unsafe.SliceData unsafe.String unsafe.StringData

    h(x+y)
    f.Close()
    <-ch
    (<-ch)
    len("foo")  // illegal if len is the built-in function

### Send statements

A send statement sends a value on a channel. The channel expression must be of [channel type](#Channel_types), the channel direction must permit send operations, and the type of the value to be sent must be [assignable](#Assignability) to the channel's element type.

    SendStmt = Channel "<-" Expression .
    Channel  = Expression .

Both the channel and the value expression are evaluated before communication begins. Communication blocks until the send can proceed. A send on an unbuffered channel can proceed if a receiver is ready. A send on a buffered channel can proceed if there is room in the buffer. A send on a closed channel proceeds by causing a [run-time panic](#Run_time_panics). A send on a `nil` channel blocks forever.

    ch <- 3  // send value 3 to channel ch

If the type of the channel expression is a [type parameter](#Type_parameter_declarations), all types in its type set must be channel types that permit send operations, they must all have the same element type, and the type of the value to be sent must be assignable to that element type.

### IncDec statements

The "++" and "--" statements increment or decrement their operands by the untyped [constant](#Constants) `1`. As with an assignment, the operand must be [addressable](#Address_operators) or a map index expression.

    IncDecStmt = Expression ( "++" | "--" ) .

The following [assignment statements](#Assignment_statements) are semantically equivalent:

    IncDec statement    Assignment
    x++                 x += 1
    x--                 x -= 1

### Assignment statements

An *assignment* replaces the current value stored in a [variable](#Variables) with a new value specified by an [expression](#Expressions). An assignment statement may assign a single value to a single variable, or multiple values to a matching number of variables.

    Assignment = ExpressionList assign_op ExpressionList .

    assign_op  = [ add_op | mul_op ] "=" .

Each left-hand side operand must be [addressable](#Address_operators), a map index expression, or (for `=` assignments only) the [blank identifier](#Blank_identifier). Operands may be parenthesized.

    x = 1
    *p = f()
    a[i] = 23
    (k) = <-ch  // same as: k = <-ch

An *assignment operation* `x` *op*`=` `y` where *op* is a binary [arithmetic operator](#Arithmetic_operators) is equivalent to `x` `=` `x` *op* `(y)` but evaluates `x` only once. The *op*`=` construct is a single token. In assignment operations, both the left- and right-hand expression lists must contain exactly one single-valued expression, and the left-hand expression must not be the blank identifier.

    a[i] <<= 2
    i &^= 1<<n

A tuple assignment assigns the individual elements of a multi-valued operation to a list of variables. There are two forms. In the first, the right hand operand is a single multi-valued expression such as a function call, a [channel](#Channel_types) or [map](#Map_types) operation, or a [type assertion](#Type_assertions). The number of operands on the left hand side must match the number of values. For instance, if `f` is a function returning two values,

    x, y = f()

assigns the first value to `x` and the second to `y`. In the second form, the number of operands on the left must equal the number of expressions on the right, each of which must be single-valued, and the *n*th expression on the right is assigned to the *n*th operand on the left:

    one, two, three = '一', '二', '三'

The [blank identifier](#Blank_identifier) provides a way to ignore right-hand side values in an assignment:

    _ = x       // evaluate x but ignore it
    x, _ = f()  // evaluate f() but ignore second result value

The assignment proceeds in two phases. First, the operands of [index expressions](#Index_expressions) and [pointer indirections](#Address_operators) (including implicit pointer indirections in [selectors](#Selectors)) on the left and the expressions on the right are all [evaluated in the usual order](#Order_of_evaluation). Second, the assignments are carried out in left-to-right order.

    a, b = b, a  // exchange a and b

    x := []int{1, 2, 3}
    i := 0
    i, x[i] = 1, 2  // set i = 1, x[0] = 2

    i = 0
    x[i], i = 2, 1  // set x[0] = 2, i = 1

    x[0], x[0] = 1, 2  // set x[0] = 1, then x[0] = 2 (so x[0] == 2 at end)

    x[1], x[3] = 4, 5  // set x[1] = 4, then panic setting x[3] = 5.

    type Point struct { x, y int }
    var p *Point
    x[2], p.x = 6, 7  // set x[2] = 6, then panic setting p.x = 7

    i = 2
    x = []int{3, 5, 7}
    for i, x[i] = range x {  // set i, x[2] = 0, x[0]
        break
    }
    // after this loop, i == 0 and x is []int{3, 5, 3}

In assignments, each value must be [assignable](#Assignability) to the type of the operand to which it is assigned, with the following special cases:

1.  Any typed value may be assigned to the blank identifier.
2.  If an untyped constant is assigned to a variable of interface type or the blank identifier, the constant is first implicitly [converted](#Conversions) to its [default type](#Constants).
3.  If an untyped boolean value is assigned to a variable of interface type or the blank identifier, it is first implicitly converted to type `bool`.

When a value is assigned to a variable, only the data that is stored in the variable is replaced. If the value contains a [reference](#Representation_of_values), the assignment copies the reference but does not make a copy of the referenced data (such as the underlying array of a slice).

    var s1 = []int{1, 2, 3}
    var s2 = s1                    // s2 stores the slice descriptor of s1
    s1 = s1[:1]                    // s1's length is 1 but it still shares its underlying array with s2
    s2[0] = 42                     // setting s2[0] changes s1[0] as well
    fmt.Println(s1, s2)            // prints [42] [42 2 3]

    var m1 = make(map[string]int)
    var m2 = m1                    // m2 stores the map descriptor of m1
    m1["foo"] = 42                 // setting m1["foo"] changes m2["foo"] as well
    fmt.Println(m2["foo"])         // prints 42

### If statements

"If" statements specify the conditional execution of two branches according to the value of a boolean expression. If the expression evaluates to true, the "if" branch is executed, otherwise, if present, the "else" branch is executed.

    IfStmt = "if" [ SimpleStmt ";" ] Expression Block [ "else" ( IfStmt | Block ) ] .

    if x > max {
        x = max
    }

The expression may be preceded by a simple statement, which executes before the expression is evaluated.

    if x := f(); x < y {
        return x
    } else if x > z {
        return z
    } else {
        return y
    }

### Switch statements

"Switch" statements provide multi-way execution. An expression or type is compared to the "cases" inside the "switch" to determine which branch to execute.

    SwitchStmt = ExprSwitchStmt | TypeSwitchStmt .

There are two forms: expression switches and type switches. In an expression switch, the cases contain expressions that are compared against the value of the switch expression. In a type switch, the cases contain types that are compared against the type of a specially annotated switch expression. The switch expression is evaluated exactly once in a switch statement.

#### Expression switches

In an expression switch, the switch expression is evaluated and the case expressions, which need not be constants, are evaluated left-to-right and top-to-bottom; the first one that equals the switch expression triggers execution of the statements of the associated case; the other cases are skipped. If no case matches and there is a "default" case, its statements are executed. There can be at most one default case and it may appear anywhere in the "switch" statement. A missing switch expression is equivalent to the boolean value `true`.

    ExprSwitchStmt = "switch" [ SimpleStmt ";" ] [ Expression ] "{" { ExprCaseClause } "}" .
    ExprCaseClause = ExprSwitchCase ":" StatementList .
    ExprSwitchCase = "case" ExpressionList | "default" .

If the switch expression evaluates to an untyped constant, it is first implicitly [converted](#Conversions) to its [default type](#Constants). The predeclared untyped value `nil` cannot be used as a switch expression. The switch expression type must be [comparable](#Comparison_operators).

If a case expression is untyped, it is first implicitly [converted](#Conversions) to the type of the switch expression. For each (possibly converted) case expression `x` and the value `t` of the switch expression, `x == t` must be a valid [comparison](#Comparison_operators).

In other words, the switch expression is treated as if it were used to declare and initialize a temporary variable `t` without explicit type; it is that value of `t` against which each case expression `x` is tested for equality.

In a case or default clause, the last non-empty statement may be a (possibly [labeled](#Labeled_statements)) ["fallthrough" statement](#Fallthrough_statements) to indicate that control should flow from the end of this clause to the first statement of the next clause. Otherwise control flows to the end of the "switch" statement. A "fallthrough" statement may appear as the last statement of all but the last clause of an expression switch.

The switch expression may be preceded by a simple statement, which executes before the expression is evaluated.

    switch tag {
    default: s3()
    case 0, 1, 2, 3: s1()
    case 4, 5, 6, 7: s2()
    }

    switch x := f(); {  // missing switch expression means "true"
    case x < 0: return -x
    default: return x
    }

    switch {
    case x < y: f1()
    case x < z: f2()
    case x == 4: f3()
    }

Implementation restriction: A compiler may disallow multiple case expressions evaluating to the same constant. For instance, the current compilers disallow duplicate integer, floating point, or string constants in case expressions.

#### Type switches

A type switch compares types rather than values. It is otherwise similar to an expression switch. It is marked by a special switch expression that has the form of a [type assertion](#Type_assertions) using the keyword `type` rather than an actual type:

    switch x.(type) {
    // cases
    }

Cases then match actual types `T` against the dynamic type of the expression `x`. As with type assertions, `x` must be of [interface type](#Interface_types), but not a [type parameter](#Type_parameter_declarations), and each non-interface type `T` listed in a case must implement the type of `x`. The types listed in the cases of a type switch must all be [different](#Type_identity).

    TypeSwitchStmt  = "switch" [ SimpleStmt ";" ] TypeSwitchGuard "{" { TypeCaseClause } "}" .
    TypeSwitchGuard = [ identifier ":=" ] PrimaryExpr "." "(" "type" ")" .
    TypeCaseClause  = TypeSwitchCase ":" StatementList .
    TypeSwitchCase  = "case" TypeList | "default" .

The TypeSwitchGuard may include a [short variable declaration](#Short_variable_declarations). When that form is used, the variable is declared at the end of the TypeSwitchCase in the [implicit block](#Blocks) of each clause. In clauses with a case listing exactly one type, the variable has that type; otherwise, the variable has the type of the expression in the TypeSwitchGuard.

Instead of a type, a case may use the predeclared identifier [`nil`](#Predeclared_identifiers); that case is selected when the expression in the TypeSwitchGuard is a `nil` interface value. There may be at most one `nil` case.

Given an expression `x` of type `interface{}`, the following type switch:

    switch i := x.(type) {
    case nil:
        printString("x is nil")                // type of i is type of x (interface{})
    case int:
        printInt(i)                            // type of i is int
    case float64:
        printFloat64(i)                        // type of i is float64
    case func(int) float64:
        printFunction(i)                       // type of i is func(int) float64
    case bool, string:
        printString("type is bool or string")  // type of i is type of x (interface{})
    default:
        printString("don't know the type")     // type of i is type of x (interface{})
    }

could be rewritten:

    v := x  // x is evaluated exactly once
    if v == nil {
        i := v                                 // type of i is type of x (interface{})
        printString("x is nil")
    } else if i, isInt := v.(int); isInt {
        printInt(i)                            // type of i is int
    } else if i, isFloat64 := v.(float64); isFloat64 {
        printFloat64(i)                        // type of i is float64
    } else if i, isFunc := v.(func(int) float64); isFunc {
        printFunction(i)                       // type of i is func(int) float64
    } else {
        _, isBool := v.(bool)
        _, isString := v.(string)
        if isBool || isString {
            i := v                         // type of i is type of x (interface{})
            printString("type is bool or string")
        } else {
            i := v                         // type of i is type of x (interface{})
            printString("don't know the type")
        }
    }

A [type parameter](#Type_parameter_declarations) or a [generic type](#Type_declarations) may be used as a type in a case. If upon [instantiation](#Instantiations) that type turns out to duplicate another entry in the switch, the first matching case is chosen.

    func f[P any](x any) int {
        switch x.(type) {
        case P:
            return 0
        case string:
            return 1
        case []P:
            return 2
        case []byte:
            return 3
        default:
            return 4
        }
    }

    var v1 = f[string]("foo")   // v1 == 0
    var v2 = f[byte]([]byte{})  // v2 == 2

The type switch guard may be preceded by a simple statement, which executes before the guard is evaluated.

The "fallthrough" statement is not permitted in a type switch.

### For statements

A "for" statement specifies repeated execution of a block. There are three forms: The iteration may be controlled by a single condition, a "for" clause, or a "range" clause.

    ForStmt   = "for" [ Condition | ForClause | RangeClause ] Block .
    Condition = Expression .

#### For statements with single condition

In its simplest form, a "for" statement specifies the repeated execution of a block as long as a boolean condition evaluates to true. The condition is evaluated before each iteration. If the condition is absent, it is equivalent to the boolean value `true`.

    for a < b {
        a *= 2
    }

#### For statements with `for` clause

A "for" statement with a ForClause is also controlled by its condition, but additionally it may specify an *init* and a *post* statement, such as an assignment, an increment or decrement statement. The init statement may be a [short variable declaration](#Short_variable_declarations), but the post statement must not.

    ForClause = [ InitStmt ] ";" [ Condition ] ";" [ PostStmt ] .
    InitStmt  = SimpleStmt .
    PostStmt  = SimpleStmt .

    for i := 0; i < 10; i++ {
        f(i)
    }

If non-empty, the init statement is executed once before evaluating the condition for the first iteration; the post statement is executed after each execution of the block (and only if the block was executed). Any element of the ForClause may be empty but the [semicolons](#Semicolons) are required unless there is only a condition. If the condition is absent, it is equivalent to the boolean value `true`.

    for cond { S() }    is the same as    for ; cond ; { S() }
    for      { S() }    is the same as    for true     { S() }

Each iteration has its own separate declared variable (or variables) \[[Go 1.22](#Go_1.22)\]. The variable used by the first iteration is declared by the init statement. The variable used by each subsequent iteration is declared implicitly before executing the post statement and initialized to the value of the previous iteration's variable at that moment.

    var prints []func()
    for i := 0; i < 5; i++ {
        prints = append(prints, func() { println(i) })
        i++
    }
    for _, p := range prints {
        p()
    }

prints

    1
    3
    5

Prior to \[[Go 1.22](#Go_1.22)\], iterations share one set of variables instead of having their own separate variables. In that case, the example above prints

    6
    6
    6

#### For statements with `range` clause

A "for" statement with a "range" clause iterates through all entries of an array, slice, string or map, values received on a channel, integer values from zero to an upper limit \[[Go 1.22](#Go_1.22)\], or values passed to an iterator function's yield function \[[Go 1.23](#Go_1.23)\]. For each entry it assigns *iteration values* to corresponding *iteration variables* if present and then executes the block.

    RangeClause = [ ExpressionList "=" | IdentifierList ":=" ] "range" Expression .

The expression on the right in the "range" clause is called the *range expression*, which may be an array, pointer to an array, slice, string, map, channel permitting [receive operations](#Receive_operator), an integer, or a function with specific signature (see below). As with an assignment, if present the operands on the left must be [addressable](#Address_operators) or map index expressions; they denote the iteration variables. If the range expression is a function, the maximum number of iteration variables depends on the function signature. If the range expression is a channel or integer, at most one iteration variable is permitted; otherwise there may be up to two. If the last iteration variable is the [blank identifier](#Blank_identifier), the range clause is equivalent to the same clause without that identifier.

The range expression `x` is evaluated before beginning the loop, with one exception: if at most one iteration variable is present and `x` or [`len(x)`](#Length_and_capacity) is [constant](#Constants), the range expression is not evaluated.

Function calls on the left are evaluated once per iteration. For each iteration, iteration values are produced as follows if the respective iteration variables are present:

    Range expression                                       1st value                2nd value

    array or slice      a  [n]E, *[n]E, or []E             index    i  int          a[i]       E
    string              s  string type                     index    i  int          see below  rune
    map                 m  map[K]V                         key      k  K            m[k]       V
    channel             c  chan E, <-chan E                element  e  E
    integer value       n  integer type, or untyped int    value    i  see below
    function, 0 values  f  func(yield func() bool)
    function, 1 value   f  func(yield func(V) bool)        value    v  V                               yield cannot be variadic
    function, 2 values  f  func(yield func(K, V) bool)     key      k  K            v          V       yield cannot be variadic

1.  For an array, pointer to array, or slice value `a`, the index iteration values are produced in increasing order, starting at element index 0. If at most one iteration variable is present, the range loop produces iteration values from 0 up to `len(a)-1` and does not index into the array or slice itself. For a `nil` slice, the number of iterations is 0.
2.  For a string value, the "range" clause iterates over the Unicode code points in the string starting at byte index 0. On successive iterations, the index value will be the index of the first byte of successive UTF-8-encoded code points in the string, and the second value, of type `rune`, will be the value of the corresponding code point. If the iteration encounters an invalid UTF-8 sequence, the second value will be `0xFFFD`, the Unicode replacement character, and the next iteration will advance a single byte in the string.
3.  The iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next. If a map entry that has not yet been reached is removed during iteration, the corresponding iteration value will not be produced. If a map entry is created during iteration, that entry may be produced during the iteration or may be skipped. The choice may vary for each entry created and from one iteration to the next. If the map is `nil`, the number of iterations is 0.
4.  For channels, the iteration values produced are the successive values sent on the channel until the channel is [closed](#Close). If the channel is `nil`, the range expression blocks forever.
5.  For an integer value `n`, where `n` is of [integer type](#Numeric_types) or an untyped [integer constant](#Constants), the iteration values 0 through `n-1` are produced in increasing order. If `n` is of integer type, the iteration values have that same type. Otherwise, the type of `n` is determined as if it were assigned to the iteration variable. Specifically: if the iteration variable is preexisting, the type of the iteration values is the type of the iteration variable, which must be of integer type. Otherwise, if the iteration variable is declared by the "range" clause or is absent, the type of the iteration values is the [default type](#Constants) for `n`. If `n` &lt;= 0, the loop does not run any iterations.
6.  For a function `f`, the iteration proceeds by calling `f` with a new, synthesized `yield` function as its argument. If `yield` is called before `f` returns, the arguments to `yield` become the iteration values for executing the loop body once. After each successive loop iteration, `yield` returns true and may be called again to continue the loop. As long as the loop body does not terminate, the "range" clause will continue to generate iteration values this way for each `yield` call until `f` returns. If the loop body terminates (such as by a `break` statement), `yield` returns false and must not be called again.

If the type of the range expression is a [type parameter](#Type_parameter_declarations), all types in its type set must have the same underlying type and the range expression must be valid for that type, or, if the type set contains channel types, it must only contain channel types with identical element types, and all channel types must permit receive operations.

The iteration variables may be declared by the "range" clause using a form of [short variable declaration](#Short_variable_declarations) (`:=`). In this case their [scope](#Declarations_and_scope) is the block of the "for" statement and each iteration has its own new variables \[[Go 1.22](#Go_1.22)\] (see also ["for" statements with a ForClause](#For_clause)). The variables have the types of their respective iteration values.

If the iteration variables are not explicitly declared by the "range" clause, they must be preexisting. In this case, the iteration values are assigned to the respective variables as in an [assignment statement](#Assignment_statements).

    var testdata *struct {
        a *[7]int
    }
    for i, _ := range testdata.a {
        // testdata.a is never evaluated; len(testdata.a) is constant
        // i ranges from 0 to 6
        f(i)
    }

    var a [10]string
    for i, s := range a {
        // type of i is int
        // type of s is string
        // s == a[i]
        g(i, s)
    }

    var key string
    var val interface{}  // element type of m is assignable to val
    m := map[string]int{"mon":0, "tue":1, "wed":2, "thu":3, "fri":4, "sat":5, "sun":6}
    for key, val = range m {
        h(key, val)
    }
    // key == last map key encountered in iteration
    // val == map[key]

    var ch chan Work = producer()
    for w := range ch {
        doWork(w)
    }

    // empty a channel
    for range ch {}

    // call f(0), f(1), ... f(9)
    for i := range 10 {
        // type of i is int (default type for untyped constant 10)
        f(i)
    }

    // invalid: 256 cannot be assigned to uint8
    var u uint8
    for u = range 256 {
    }

    // invalid: 1e3 is a floating-point constant
    for range 1e3 {
    }

    // fibo generates the Fibonacci sequence
    fibo := func(yield func(x int) bool) {
        f0, f1 := 0, 1
        for yield(f0) {
            f0, f1 = f1, f0+f1
        }
    }

    // print the Fibonacci numbers below 1000:
    for x := range fibo {
        if x >= 1000 {
            break
        }
        fmt.Printf("%d ", x)
    }
    // output: 0 1 1 2 3 5 8 13 21 34 55 89 144 233 377 610 987

    // iteration support for a recursive tree data structure
    type Tree[K cmp.Ordered, V any] struct {
        left, right *Tree[K, V]
        key         K
        value       V
    }

    func (t *Tree[K, V]) walk(yield func(key K, val V) bool) bool {
        return t == nil || t.left.walk(yield) && yield(t.key, t.value) && t.right.walk(yield)
    }

    func (t *Tree[K, V]) Walk(yield func(key K, val V) bool) {
        t.walk(yield)
    }

    // walk tree t in-order
    var t Tree[string, int]
    for k, v := range t.Walk {
        // process k, v
    }

    // xor returns the xor-ed bytes of S
    func xor[S ~[]byte](s S) byte {
        var r byte
        for _, b := range s {
            r ^= b
        }
        return r
    }

### Go statements

A "go" statement starts the execution of a function call as an independent concurrent thread of control, or *goroutine*, within the same address space.

    GoStmt = "go" Expression .

The expression must be a function or method call; it cannot be parenthesized. Calls of built-in functions are restricted as for [expression statements](#Expression_statements).

The function value and parameters are [evaluated as usual](#Calls) in the calling goroutine, but unlike with a regular call, program execution does not wait for the invoked function to complete. Instead, the function begins executing independently in a new goroutine. When the function terminates, its goroutine also terminates. If the function has any return values, they are discarded when the function completes.

    go Server()
    go func(ch chan<- bool) { for { sleep(10); ch <- true }} (c)

### Select statements

A "select" statement chooses which of a set of possible [send](#Send_statements) or [receive](#Receive_operator) operations will proceed. It looks similar to a ["switch"](#Switch_statements) statement but with the cases all referring to communication operations.

    SelectStmt = "select" "{" { CommClause } "}" .
    CommClause = CommCase ":" StatementList .
    CommCase   = "case" ( SendStmt | RecvStmt ) | "default" .
    RecvStmt   = [ ExpressionList "=" | IdentifierList ":=" ] RecvExpr .
    RecvExpr   = Expression .

A case with a RecvStmt may assign the result of a RecvExpr to one or two variables, which may be declared using a [short variable declaration](#Short_variable_declarations). The RecvExpr must be a (possibly parenthesized) receive operation. There can be at most one default case and it may appear anywhere in the list of cases.

Execution of a "select" statement proceeds in several steps:

1.  For all the cases in the statement, the channel operands of receive operations and the channel and right-hand-side expressions of send statements are evaluated exactly once, in source order, upon entering the "select" statement. The result is a set of channels to receive from or send to, and the corresponding values to send. Any side effects in that evaluation will occur irrespective of which (if any) communication operation is selected to proceed. Expressions on the left-hand side of a RecvStmt with a short variable declaration or assignment are not yet evaluated.
2.  If one or more of the communications can proceed, a single one that can proceed is chosen via a uniform pseudo-random selection. Otherwise, if there is a default case, that case is chosen. If there is no default case, the "select" statement blocks until at least one of the communications can proceed.
3.  Unless the selected case is the default case, the respective communication operation is executed.
4.  If the selected case is a RecvStmt with a short variable declaration or an assignment, the left-hand side expressions are evaluated and the received value (or values) are assigned.
5.  The statement list of the selected case is executed.

Since communication on `nil` channels can never proceed, a select with only `nil` channels and no default case blocks forever.

    var a []int
    var c, c1, c2, c3, c4 chan int
    var i1, i2 int
    select {
    case i1 = <-c1:
        print("received ", i1, " from c1\n")
    case c2 <- i2:
        print("sent ", i2, " to c2\n")
    case i3, ok := (<-c3):  // same as: i3, ok := <-c3
        if ok {
            print("received ", i3, " from c3\n")
        } else {
            print("c3 is closed\n")
        }
    case a[f()] = <-c4:
        // same as:
        // case t := <-c4
        //  a[f()] = t
    default:
        print("no communication\n")
    }

    for {  // send random sequence of bits to c
        select {
        case c <- 0:  // note: no statement, no fallthrough, no folding of cases
        case c <- 1:
        }
    }

    select {}  // block forever

### Return statements

A "return" statement in a function `F` terminates the execution of `F`, and optionally provides one or more result values. Any functions [deferred](#Defer_statements) by `F` are executed before `F` returns to its caller.

    ReturnStmt = "return" [ ExpressionList ] .

In a function without a result type, a "return" statement must not specify any result values.

    func noResult() {
        return
    }

There are three ways to return values from a function with a result type:

1.  The return value or values may be explicitly listed in the "return" statement. Each expression must be single-valued and [assignable](#Assignability) to the corresponding element of the function's result type.

        func simpleF() int {
            return 2
        }

        func complexF1() (re float64, im float64) {
            return -7.0, -4.0
        }

2.  The expression list in the "return" statement may be a single call to a multi-valued function. The effect is as if each value returned from that function were assigned to a temporary variable with the type of the respective value, followed by a "return" statement listing these variables, at which point the rules of the previous case apply.

        func complexF2() (re float64, im float64) {
            return complexF1()
        }

3.  The expression list may be empty if the function's result type specifies names for its [result parameters](#Function_types). The result parameters act as ordinary local variables and the function may assign values to them as necessary. The "return" statement returns the values of these variables.

        func complexF3() (re float64, im float64) {
            re = 7.0
            im = 4.0
            return
        }

        func (devnull) Write(p []byte) (n int, _ error) {
            n = len(p)
            return
        }

Regardless of how they are declared, all the result values are initialized to the [zero values](#The_zero_value) for their type upon entry to the function. A "return" statement that specifies results sets the result parameters before any deferred functions are executed.

Implementation restriction: A compiler may disallow an empty expression list in a "return" statement if a different entity (constant, type, or variable) with the same name as a result parameter is in [scope](#Declarations_and_scope) at the place of the return.

    func f(n int) (res int, err error) {
        if _, err := f(n-1); err != nil {
            return  // invalid return statement: err is shadowed
        }
        return
    }

### Break statements

A "break" statement terminates execution of the innermost ["for"](#For_statements), ["switch"](#Switch_statements), or ["select"](#Select_statements) statement within the same function.

    BreakStmt = "break" [ Label ] .

If there is a label, it must be that of an enclosing "for", "switch", or "select" statement, and that is the one whose execution terminates.

    OuterLoop:
        for i = 0; i < n; i++ {
            for j = 0; j < m; j++ {
                switch a[i][j] {
                case nil:
                    state = Error
                    break OuterLoop
                case item:
                    state = Found
                    break OuterLoop
                }
            }
        }

### Continue statements

A "continue" statement begins the next iteration of the innermost enclosing ["for" loop](#For_statements) by advancing control to the end of the loop block. The "for" loop must be within the same function.

    ContinueStmt = "continue" [ Label ] .

If there is a label, it must be that of an enclosing "for" statement, and that is the one whose execution advances.

    RowLoop:
        for y, row := range rows {
            for x, data := range row {
                if data == endOfRow {
                    continue RowLoop
                }
                row[x] = data + bias(x, y)
            }
        }

### Goto statements

A "goto" statement transfers control to the statement with the corresponding label within the same function.

    GotoStmt = "goto" Label .

    goto Error

Executing the "goto" statement must not cause any variables to come into [scope](#Declarations_and_scope) that were not already in scope at the point of the goto. For instance, this example:

        goto L  // BAD
        v := 3
    L:

is erroneous because the jump to label `L` skips the creation of `v`.

A "goto" statement outside a [block](#Blocks) cannot jump to a label inside that block. For instance, this example:

    if n%2 == 1 {
        goto L1
    }
    for n > 0 {
        f()
        n--
    L1:
        f()
        n--
    }

is erroneous because the label `L1` is inside the "for" statement's block but the `goto` is not.

### Fallthrough statements

A "fallthrough" statement transfers control to the first statement of the next case clause in an [expression "switch" statement](#Expression_switches). It may be used only as the final non-empty statement in such a clause.

    FallthroughStmt = "fallthrough" .

### Defer statements

A "defer" statement invokes a function whose execution is deferred to the moment the surrounding function returns, either because the surrounding function executed a [return statement](#Return_statements), reached the end of its [function body](#Function_declarations), or because the corresponding goroutine is [panicking](#Handling_panics).

    DeferStmt = "defer" Expression .

The expression must be a function or method call; it cannot be parenthesized. Calls of built-in functions are restricted as for [expression statements](#Expression_statements).

Each time a "defer" statement executes, the function value and parameters to the call are [evaluated as usual](#Calls) and saved anew but the actual function is not invoked. Instead, deferred functions are invoked immediately before the surrounding function returns, in the reverse order they were deferred. That is, if the surrounding function returns through an explicit [return statement](#Return_statements), deferred functions are executed *after* any result parameters are set by that return statement but *before* the function returns to its caller. If a deferred function value evaluates to `nil`, execution [panics](#Handling_panics) when the function is invoked, not when the "defer" statement is executed.

For instance, if the deferred function is a [function literal](#Function_literals) and the surrounding function has [named result parameters](#Function_types) that are in scope within the literal, the deferred function may access and modify the result parameters before they are returned. If the deferred function has any return values, they are discarded when the function completes. (See also the section on [handling panics](#Handling_panics).)

    lock(l)
    defer unlock(l)  // unlocking happens before surrounding function returns

    // prints 3 2 1 0 before surrounding function returns
    for i := 0; i <= 3; i++ {
        defer fmt.Print(i)
    }

    // f returns 42
    func f() (result int) {
        defer func() {
            // result is accessed after it was set to 6 by the return statement
            result *= 7
        }()
        return 6
    }


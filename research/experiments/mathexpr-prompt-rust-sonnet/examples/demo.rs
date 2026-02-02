use mathexpr::calc;

fn main() {
    let examples = vec![
        "2 + 3",
        "2 + 3 * 4",
        "(2 + 3) * 4",
        "2 ** 3 ** 2",
        "-5 + 3",
        "2 * -3",
        "3.14 * 2",
        ".5 + .5",
        "2 + 3 * (4 - 1)",
        "10 % 3",
    ];
    
    println!("Math Expression Evaluator Demo\n");
    for expr in examples {
        match calc(expr) {
            Ok(result) => println!("{:20} = {}", expr, result),
            Err(e) => println!("{:20} ERROR: {}", expr, e),
        }
    }
}

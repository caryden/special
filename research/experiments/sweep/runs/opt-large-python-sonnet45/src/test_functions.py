"""Standard test functions for optimization."""


def sphere_f(x):
    """Sphere function: sum(x_i^2)."""
    return sum(xi ** 2 for xi in x)


def sphere_grad(x):
    """Sphere gradient: 2*x."""
    return [2.0 * xi for xi in x]


def booth_f(x):
    """Booth function."""
    return (x[0] + 2 * x[1] - 7) ** 2 + (2 * x[0] + x[1] - 5) ** 2


def booth_grad(x):
    """Booth gradient."""
    dx = 2 * (x[0] + 2 * x[1] - 7) + 4 * (2 * x[0] + x[1] - 5)
    dy = 4 * (x[0] + 2 * x[1] - 7) + 2 * (2 * x[0] + x[1] - 5)
    return [dx, dy]


def rosenbrock_f(x):
    """Rosenbrock function."""
    return 100 * (x[1] - x[0] ** 2) ** 2 + (1 - x[0]) ** 2


def rosenbrock_grad(x):
    """Rosenbrock gradient."""
    dx = -400 * x[0] * (x[1] - x[0] ** 2) - 2 * (1 - x[0])
    dy = 200 * (x[1] - x[0] ** 2)
    return [dx, dy]


def beale_f(x):
    """Beale function."""
    t1 = 1.5 - x[0] + x[0] * x[1]
    t2 = 2.25 - x[0] + x[0] * x[1] ** 2
    t3 = 2.625 - x[0] + x[0] * x[1] ** 3
    return t1 ** 2 + t2 ** 2 + t3 ** 2


def beale_grad(x):
    """Beale gradient."""
    t1 = 1.5 - x[0] + x[0] * x[1]
    t2 = 2.25 - x[0] + x[0] * x[1] ** 2
    t3 = 2.625 - x[0] + x[0] * x[1] ** 3

    dx = 2 * t1 * (-1 + x[1]) + 2 * t2 * (-1 + x[1] ** 2) + 2 * t3 * (-1 + x[1] ** 3)
    dy = 2 * t1 * x[0] + 2 * t2 * (2 * x[0] * x[1]) + 2 * t3 * (3 * x[0] * x[1] ** 2)
    return [dx, dy]


def himmelblau_f(x):
    """Himmelblau function."""
    return (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2


def himmelblau_grad(x):
    """Himmelblau gradient."""
    dx = 4 * x[0] * (x[0] ** 2 + x[1] - 11) + 2 * (x[0] + x[1] ** 2 - 7)
    dy = 2 * (x[0] ** 2 + x[1] - 11) + 4 * x[1] * (x[0] + x[1] ** 2 - 7)
    return [dx, dy]


def goldstein_price_f(x):
    """Goldstein-Price function."""
    a = 1 + (x[0] + x[1] + 1) ** 2 * (19 - 14 * x[0] + 3 * x[0] ** 2 - 14 * x[1] + 6 * x[0] * x[1] + 3 * x[1] ** 2)
    b = 30 + (2 * x[0] - 3 * x[1]) ** 2 * (18 - 32 * x[0] + 12 * x[0] ** 2 + 48 * x[1] - 36 * x[0] * x[1] + 27 * x[1] ** 2)
    return a * b


def goldstein_price_grad(x):
    """Goldstein-Price gradient (computed via finite differences for simplicity)."""
    # This is complex, so we'll use numerical approximation
    from finite_diff import forward_diff_gradient
    return forward_diff_gradient(goldstein_price_f, x)

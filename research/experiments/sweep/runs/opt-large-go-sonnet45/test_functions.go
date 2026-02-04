package optimization

import "math"

// Test functions with analytic gradients for validation

// Sphere function: f(x) = sum(x_i^2)
func Sphere(x []float64) float64 {
	sum := 0.0
	for _, xi := range x {
		sum += xi * xi
	}
	return sum
}

func SphereGrad(x []float64) []float64 {
	grad := make([]float64, len(x))
	for i, xi := range x {
		grad[i] = 2.0 * xi
	}
	return grad
}

// Rosenbrock function: f(x,y) = (1-x)^2 + 100*(y-x^2)^2
func Rosenbrock(x []float64) float64 {
	return math.Pow(1-x[0], 2) + 100*math.Pow(x[1]-x[0]*x[0], 2)
}

func RosenbrockGrad(x []float64) []float64 {
	grad := make([]float64, 2)
	grad[0] = -2*(1-x[0]) - 400*x[0]*(x[1]-x[0]*x[0])
	grad[1] = 200 * (x[1] - x[0]*x[0])
	return grad
}

// Beale function
func Beale(x []float64) float64 {
	t1 := 1.5 - x[0] + x[0]*x[1]
	t2 := 2.25 - x[0] + x[0]*x[1]*x[1]
	t3 := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]
	return t1*t1 + t2*t2 + t3*t3
}

func BealeGrad(x []float64) []float64 {
	t1 := 1.5 - x[0] + x[0]*x[1]
	t2 := 2.25 - x[0] + x[0]*x[1]*x[1]
	t3 := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]

	dt1dx := -1 + x[1]
	dt1dy := x[0]
	dt2dx := -1 + x[1]*x[1]
	dt2dy := 2 * x[0] * x[1]
	dt3dx := -1 + x[1]*x[1]*x[1]
	dt3dy := 3 * x[0] * x[1] * x[1]

	grad := make([]float64, 2)
	grad[0] = 2*t1*dt1dx + 2*t2*dt2dx + 2*t3*dt3dx
	grad[1] = 2*t1*dt1dy + 2*t2*dt2dy + 2*t3*dt3dy
	return grad
}

// Booth function: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
func Booth(x []float64) float64 {
	t1 := x[0] + 2*x[1] - 7
	t2 := 2*x[0] + x[1] - 5
	return t1*t1 + t2*t2
}

func BoothGrad(x []float64) []float64 {
	t1 := x[0] + 2*x[1] - 7
	t2 := 2*x[0] + x[1] - 5
	grad := make([]float64, 2)
	grad[0] = 2*t1 + 4*t2
	grad[1] = 4*t1 + 2*t2
	return grad
}

// Himmelblau function: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
func Himmelblau(x []float64) float64 {
	t1 := x[0]*x[0] + x[1] - 11
	t2 := x[0] + x[1]*x[1] - 7
	return t1*t1 + t2*t2
}

func HimmelblauGrad(x []float64) []float64 {
	t1 := x[0]*x[0] + x[1] - 11
	t2 := x[0] + x[1]*x[1] - 7
	grad := make([]float64, 2)
	grad[0] = 4*x[0]*t1 + 2*t2
	grad[1] = 2*t1 + 4*x[1]*t2
	return grad
}

// GoldsteinPrice function
func GoldsteinPrice(x []float64) float64 {
	a := 1 + math.Pow(x[0]+x[1]+1, 2)*(19-14*x[0]+3*x[0]*x[0]-14*x[1]+6*x[0]*x[1]+3*x[1]*x[1])
	b := 30 + math.Pow(2*x[0]-3*x[1], 2)*(18-32*x[0]+12*x[0]*x[0]+48*x[1]-36*x[0]*x[1]+27*x[1]*x[1])
	return a * b
}

func GoldsteinPriceGrad(x []float64) []float64 {
	x0, x1 := x[0], x[1]

	// First term
	t1 := x0 + x1 + 1
	p1 := 19 - 14*x0 + 3*x0*x0 - 14*x1 + 6*x0*x1 + 3*x1*x1
	a := 1 + t1*t1*p1

	dp1dx0 := -14 + 6*x0 + 6*x1
	dp1dx1 := -14 + 6*x0 + 6*x1

	dadx0 := 2*t1*p1 + t1*t1*dp1dx0
	dadx1 := 2*t1*p1 + t1*t1*dp1dx1

	// Second term
	t2 := 2*x0 - 3*x1
	p2 := 18 - 32*x0 + 12*x0*x0 + 48*x1 - 36*x0*x1 + 27*x1*x1
	b := 30 + t2*t2*p2

	dp2dx0 := -32 + 24*x0 - 36*x1
	dp2dx1 := 48 - 36*x0 + 54*x1

	dbdx0 := 4*t2*p2 + t2*t2*dp2dx0
	dbdx1 := -6*t2*p2 + t2*t2*dp2dx1

	grad := make([]float64, 2)
	grad[0] = dadx0*b + a*dbdx0
	grad[1] = dadx1*b + a*dbdx1
	return grad
}

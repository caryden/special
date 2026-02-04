// vec-ops: Pure vector arithmetic for n-dimensional optimization

pub fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

pub fn norm(v: &[f64]) -> f64 {
    dot(v, v).sqrt()
}

pub fn norm_inf(v: &[f64]) -> f64 {
    v.iter().map(|x| x.abs()).fold(0.0, f64::max)
}

pub fn scale(v: &[f64], s: f64) -> Vec<f64> {
    v.iter().map(|x| x * s).collect()
}

pub fn add(a: &[f64], b: &[f64]) -> Vec<f64> {
    a.iter().zip(b.iter()).map(|(x, y)| x + y).collect()
}

pub fn sub(a: &[f64], b: &[f64]) -> Vec<f64> {
    a.iter().zip(b.iter()).map(|(x, y)| x - y).collect()
}

pub fn negate(v: &[f64]) -> Vec<f64> {
    scale(v, -1.0)
}

pub fn clone_vec(v: &[f64]) -> Vec<f64> {
    v.to_vec()
}

pub fn zeros(n: usize) -> Vec<f64> {
    vec![0.0; n]
}

pub fn add_scaled(a: &[f64], b: &[f64], s: f64) -> Vec<f64> {
    a.iter().zip(b.iter()).map(|(x, y)| x + s * y).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dot() {
        assert_eq!(dot(&[1.0, 2.0, 3.0], &[4.0, 5.0, 6.0]), 32.0);
        assert_eq!(dot(&[0.0, 0.0], &[1.0, 1.0]), 0.0);
    }

    #[test]
    fn test_norm() {
        assert_eq!(norm(&[3.0, 4.0]), 5.0);
        assert_eq!(norm(&[0.0, 0.0, 0.0]), 0.0);
    }

    #[test]
    fn test_norm_inf() {
        assert_eq!(norm_inf(&[1.0, -3.0, 2.0]), 3.0);
        assert_eq!(norm_inf(&[0.0, 0.0]), 0.0);
    }

    #[test]
    fn test_scale() {
        assert_eq!(scale(&[1.0, 2.0], 3.0), vec![3.0, 6.0]);
        assert_eq!(scale(&[1.0, 2.0], 0.0), vec![0.0, 0.0]);
    }

    #[test]
    fn test_add() {
        assert_eq!(add(&[1.0, 2.0], &[3.0, 4.0]), vec![4.0, 6.0]);
    }

    #[test]
    fn test_sub() {
        assert_eq!(sub(&[3.0, 4.0], &[1.0, 2.0]), vec![2.0, 2.0]);
    }

    #[test]
    fn test_negate() {
        assert_eq!(negate(&[1.0, -2.0]), vec![-1.0, 2.0]);
    }

    #[test]
    fn test_clone() {
        let v = vec![1.0, 2.0];
        let cloned = clone_vec(&v);
        assert_eq!(cloned, vec![1.0, 2.0]);
        // Verify it's a separate allocation
        assert_ne!(v.as_ptr(), cloned.as_ptr());
    }

    #[test]
    fn test_zeros() {
        assert_eq!(zeros(3), vec![0.0, 0.0, 0.0]);
    }

    #[test]
    fn test_add_scaled() {
        assert_eq!(add_scaled(&[1.0, 2.0], &[3.0, 4.0], 2.0), vec![7.0, 10.0]);
    }

    #[test]
    fn test_purity_add() {
        let a = vec![1.0, 2.0];
        let b = vec![3.0, 4.0];
        let _result = add(&a, &b);
        assert_eq!(a, vec![1.0, 2.0]);
        assert_eq!(b, vec![3.0, 4.0]);
    }

    #[test]
    fn test_purity_scale() {
        let v = vec![1.0, 2.0];
        let _result = scale(&v, 3.0);
        assert_eq!(v, vec![1.0, 2.0]);
    }

    #[test]
    fn test_purity_clone() {
        let v = vec![1.0, 2.0];
        let mut cloned = clone_vec(&v);
        cloned[0] = 999.0;
        assert_eq!(v, vec![1.0, 2.0]);
    }
}

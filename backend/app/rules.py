"""Pure rule evaluator. No DB or framework dependencies."""


def evaluate_rule(operator: str, threshold: float, value: float | None) -> bool:
    """Evaluate a comparison rule against a metric value.

    Returns False when value is None (missing data never triggers a rule).
    Returns False for unknown operators as a safe fallback.
    """
    if value is None:
        return False
    match operator:
        case "lt":
            return value < threshold
        case "lte":
            return value <= threshold
        case "gt":
            return value > threshold
        case "gte":
            return value >= threshold
        case "eq":
            return value == threshold
        case "neq":
            return value != threshold
    return False

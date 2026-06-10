package md.sacramento.pricing;

public enum RoundingRule {
    /** Без округления (банковские копейки, 2 знака). */
    NONE,
    /** Вверх до целого лея. */
    TO_1,
    /** Вверх до 5 леев. */
    TO_5
}

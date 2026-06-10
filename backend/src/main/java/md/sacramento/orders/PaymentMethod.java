package md.sacramento.orders;

import java.util.Set;

public enum PaymentMethod {
    CASH_COURIER,
    CARD_PICKUP,
    CASH_PICKUP;

    /** Какие способы оплаты допустимы для способа получения. */
    public static Set<PaymentMethod> allowedFor(DeliveryMethod delivery) {
        return switch (delivery) {
            case COURIER -> Set.of(CASH_COURIER);
            case PICKUP -> Set.of(CARD_PICKUP, CASH_PICKUP);
        };
    }
}

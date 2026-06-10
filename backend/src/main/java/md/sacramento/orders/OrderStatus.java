package md.sacramento.orders;

import java.util.Set;

public enum OrderStatus {
    NEW,
    CONFIRMED,
    ASSEMBLING,
    DELIVERING,
    READY_FOR_PICKUP,
    DONE,
    CANCELLED;

    /** Допустимые переходы статусной машины (CANCELLED доступен из любого нефинального). */
    public Set<OrderStatus> nextStatuses() {
        return switch (this) {
            case NEW -> Set.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> Set.of(ASSEMBLING, CANCELLED);
            case ASSEMBLING -> Set.of(DELIVERING, READY_FOR_PICKUP, CANCELLED);
            case DELIVERING, READY_FOR_PICKUP -> Set.of(DONE, CANCELLED);
            case DONE, CANCELLED -> Set.of();
        };
    }

    /** Резерв уже удержан в этом статусе? (нужен возврат при отмене) */
    public boolean holdsReservation() {
        return this == CONFIRMED || this == ASSEMBLING
                || this == DELIVERING || this == READY_FOR_PICKUP;
    }
}

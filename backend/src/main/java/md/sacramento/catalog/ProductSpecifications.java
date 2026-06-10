package md.sacramento.catalog;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import md.sacramento.vehicles.ProductVehicle;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

final class ProductSpecifications {

    private ProductSpecifications() {
    }

    static Specification<Product> matches(ProductFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.activeOnly()) {
                predicates.add(cb.isTrue(root.get("active")));
            }
            if (filter.categoryIds() != null && !filter.categoryIds().isEmpty()) {
                predicates.add(root.get("category").get("id").in(filter.categoryIds()));
            }
            if (filter.brand() != null && !filter.brand().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("brand")), filter.brand().toLowerCase()));
            }
            if (filter.inStockOnly()) {
                predicates.add(cb.greaterThan(
                        cb.diff(root.get("stockQty"), root.get("reservedQty")), 0));
            }
            if (filter.priceMin() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("retailPrice"), filter.priceMin()));
            }
            if (filter.priceMax() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("retailPrice"), filter.priceMax()));
            }
            if (filter.vehicleId() != null) {
                Subquery<Long> sub = query.subquery(Long.class);
                var pv = sub.from(ProductVehicle.class);
                sub.select(pv.get("id").get("productId"))
                        .where(cb.equal(pv.get("id").get("vehicleId"), filter.vehicleId()));
                predicates.add(root.get("id").in(sub));
            }
            if (filter.search() != null && !filter.search().isBlank()) {
                String term = "%" + filter.search().trim().toLowerCase() + "%";
                String normalized = "%" + OemNumber.normalize(filter.search()) + "%";

                Subquery<Long> oemSub = query.subquery(Long.class);
                var oemRoot = oemSub.from(Product.class);
                Join<Object, Object> oem = oemRoot.join("oemNumbers", JoinType.INNER);
                oemSub.select(oemRoot.get("id"))
                        .where(cb.like(oem.get("normalized"), normalized));

                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("sku")), term),
                        normalized.length() > 2 ? root.get("id").in(oemSub) : cb.disjunction()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}


function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onOpenProduct
}) {
  return (
    <article
      className="product-card"
      role="button"
      tabIndex={0}
      aria-label={`مشاهده جزئیات ${product.name}`}
      onClick={() => onOpenProduct(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenProduct(product);
        }
      }}
    >
      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>

      <div className="product-info">
        <div className="product-top">
          <button
            className={`favorite-button ${isFavorite ? "active" : ""}`}
            type="button"
            aria-label={
              isFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "افزودن به علاقه‌مندی‌ها"
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(product.id);
            }}
          >
            <img
              src={
                isFavorite
                  ? "/images/favourite-filled.svg"
                  : "/images/favourite.svg"
              }
              alt=""
              className="favorite-icon"
            />
          </button>

          <span className="product-rating">
            {product.rating} ⭐
          </span>

          {product.badge && (
            <span className="product-badge">
              {product.badge}
            </span>
          )}
        </div>

        <h3>{product.name}</h3>

        <div className="product-divider" />

        <div className="product-price">
          <strong>
            {Number(product.price || 0).toLocaleString("fa-IR")}
          </strong>
          <span>{product.currency || "تومان"}</span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;

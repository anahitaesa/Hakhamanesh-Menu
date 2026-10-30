
import { restaurantData } from './restaurantData'
import './ProductDetails.css'

function ProductDetails({
  product,
  onBack,
  isFavorite,
  onToggleFavorite,
}) {
  // اگر محصولی انتخاب نشده، چیزی نمایش نده
  if (!product) return null

  // قیمت را با جداکننده و اعداد فارسی نمایش بده
  const formattedPrice = Number(product.price || 0).toLocaleString('fa-IR')

  // ترکیبات از اطلاعات خود محصول خوانده می‌شوند
  const ingredients = product.ingredients || []

  return (
    <div className="product-sheet-overlay" onClick={onBack}>
      <section
        className="product-sheet"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={`جزئیات ${product.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* بخش اسکرول‌پذیر: سربرگ، تصویر و اطلاعات محصول */}
        <div className="product-sheet-scroll">

          {/* سربرگ */}
          <header className="product-sheet-header">
            <button
              type="button"
              className="sheet-back-button"
              onClick={onBack}
              aria-label="بازگشت"
            >
              <img src="/images/arrow.svg" alt="" />
            </button>

            <button
              type="button"
              className="favorite-button"
              aria-label={
                isFavorite
                  ? 'حذف از علاقه‌مندی‌ها'
                  : 'افزودن به علاقه‌مندی‌ها'
              }
              onClick={() => onToggleFavorite(product.id)}
            >
              <img
                src={
                  isFavorite
                    ? '/images/favourite-filled.svg'
                    : '/images/favourite.svg'
                }
                alt=""
                className="favorite-icon"
              />
            </button>
          </header>

          {/* تصویر اصلی محصول */}
          <img
            className="product-sheet-image"
            src={product.image}
            alt={product.name}
          />

          {/* اطلاعات محصول */}
          <div className="product-sheet-content">

            {/* نشان، امتیاز و قیمت */}
            <div className="product-highlights">
              <span className="product-badge">
                {product.badge || 'ویژه هخامنش'}
              </span>

              <span className="product-sheet-rating">
                ⭐ {product.rating ?? '—'}
              </span>

              <div className="product-price">
                <strong>{formattedPrice}</strong>
                <span>{product.currency || 'تومان'}</span>
              </div>
            </div>

            {/* نام و توضیحات */}
            <h1 className="product-sheet-title">{product.name}</h1>

            <p className="product-sheet-description">
              {product.description || 'توضیحی برای این محصول ثبت نشده است.'}
            </p>

            <hr className="product-section-divider" />

            {/* ترکیبات و مواد اولیه */}
            <section className="product-ingredients">
              <h2>ترکیبات و مواد اولیه</h2>

              <div className="ingredients-list">
                {ingredients.map((ingredient, index) => (
                  <span
                    className="ingredient-chip"
                    key={`${ingredient}-${index}`}
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </section>

            {/* کالری و زمان آماده‌سازی */}
            <div className="product-facts">
              <div className="product-fact">
                <span className="product-fact-icon">⚡</span>
                <span className="product-fact-label">انرژی تقریبی</span>
                <strong>
                  {product.calories != null
                    ? `${Number(product.calories).toLocaleString('fa-IR')} کالری`
                    : 'ثبت نشده'}
                </strong>
              </div>

              <div className="product-fact">
                <span className="product-fact-icon">◷</span>
                <span className="product-fact-label">زمان آماده‌سازی</span>
                <strong>{product.preparationTime || 'ثبت نشده'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* فوتر ثابت در پایین پنل */}
        <footer className="product-sheet-footer">
          <div className="restaurant-contact">
            <span className="contact-label">تماس با رستوران</span>
            <a href={`tel:${restaurantData.phone}`}>
              {restaurantData.phone}
            </a>
          </div>

          <button
            type="button"
            className="product-share-button"
            aria-label="اشتراک‌گذاری محصول"
            onClick={() => {
              const shareUrl = window.location.href

              if (navigator.share) {
                navigator.share({
                  title: product.name,
                  text: product.description || product.name,
                  url: shareUrl,
                }).catch(() => {})
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).catch(() => {})
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="share-icon"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.7 10.6 15.3 6.4 M8.7 13.4 15.3 17.6" />
            </svg>
          </button>
        </footer>
      </section>
    </div>
  )
}

export default ProductDetails

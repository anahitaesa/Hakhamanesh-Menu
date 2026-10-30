import Header from './Header';
import './MenuPage.css'
import { useState } from 'react'
import {products} from './data/products'
import ProductCard from './ProductCard'
import RestaurantInfo from './RestaurantInfo';
import ProductDetails from './ProductDetails';


function MenuPage() {
  // دسته‌بندی‌های اولیه منوی رستوران
  const categories = [
  { name: 'همه آیتم‌ها', icon: '🍽️' },
  { name: 'پیتزا', icon: '🍕' },
  { name: 'برگر', icon: '🍔' },
  { name: 'ساندویچ', icon: '🥪' },
  { name: 'سیب‌زمینی', icon: '🍟' },
  { name: 'نوشیدنی', icon: '🥤' },
  { name: 'سس‌ها', icon: '🥫' },
  { name: 'سالاد', icon: '🥗' },
  { name: 'پیش‌غذا', icon: '🍗' },
  { name: 'دسر', icon: '🍰' },
]


  // نگهداری شناسه محصولات علاقه مندی
  const [favorites, setFavorites] = useState([]);
  // نگهداری متن جستجو
  const [searchText, setSearchText] = useState('');
  // ذخیره دسته‌بندی انتخاب‌شده
  const [selectedCategory, setSelectedCategory] = useState('همه آیتم‌ها');
  // فقط محصولاتی رو نگه میداریم که فعال باشند
  // با دسته بندی انتخاب شده مطابقت داشته باشند
  // و نامشان با متن جستجو یکی باشد
  const filteredProducts = products.filter((product) => {
    const isActive = product.isActive;

    // اگر "همه" انتخاب شده باشد فیلتر دسته بندی اعمال نمی شود
    const matchesCategory = 
      selectedCategory == 'همه آیتم‌ها' ||
      product.category == selectedCategory;

      // بررسی نام محصول براساس متن جستجو
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchText.trim().toLowerCase());

    // باید هر سه شرط رو داشته باشد
    return isActive && matchesCategory && matchesSearch;
  });

  // افزودن محصول به علاقه مندی یا حذف ان
  const toggleFavorite = (productId) => {
    setFavorites((prevFavorites) => 
      prevFavorites.includes(productId)
        ? prevFavorites.filter((id) => id !== productId) : [...prevFavorites, productId]);
  };


  // اطلاعات رستوران


  // مشخص می‌کند کدام بخش از منو نمایش داده شود
  const [activeTab, setActiveTab] = useState('menu');

  const [selectedProduct, setSelectedProduct] = useState(null);

  const openProduct = (product) => {
    setSelectedProduct(product);
    // setActiveTab('details');
    // window.scrollTo(0,0);
  };
 
  // انتخاب محصولات قابل نمایش بر اساس بخش فعال
  const displayedProducts = 
    activeTab === 'favorites'
      ? filteredProducts.filter((product) =>
        favorites.includes(product.id)
    )
    : filteredProducts;


  return (
    <main className="menu-page" dir="rtl">
      <Header />

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          isFavorite={favorites.includes(selectedProduct.id)}
          onToggleFavorite={toggleFavorite}  
        />
      )}

      {activeTab === 'details' ? (
        <ProductDetails
          product={selectedProduct}
          onBack={() => {
            setSelectedProduct(null);
            setActiveTab('menu');
          }} 
          />
        ) : activeTab === 'info' ? (
          <RestaurantInfo />
        ) : (
        <>
        

      {/* جست‌وجوی محصولات */}
      <div className="menu-search">
        <svg 
        className="search-icon" 
        viewBox="0 0 24 24" 
        width="22" 
        height="22" 
        fill="none" 
        stroke="currentColor"
        strokeWidth="1.8" 
        strokeLinecap="round" 
        aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>

        <input type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="دنبال چی می‌گردی؟"
            aria-label="جستجوی غذا" />
        
        {searchText && (
          <button className="clear-search" type="button" onClick={() => setSearchText('')} aria-label="پاک کردن جستجو" >
            ×
          </button>
        )}

      </div>

      {/* دسته‌بندی‌های غذا */}
      <section className="menu-categories">
        <h2>دسته‌بندی‌ها</h2>

        <div className="category-list">
          {categories.map((category) => (
            <button 
            className={`category-item ${
              selectedCategory === category.name ? 'active' : '' 
            }`}
            key={category.name}
            type="button"

            // با کلیک، دسته‌بندی انتخاب‌شده تغییر می‌کند
            onClick={() => setSelectedCategory(category.name)}
            >
              {/* نمایش آیکن دسته‌بندی */}
              <span className="category-icon" aria-hidden="true">
                {category.icon}
              </span>

              {/* نمایش نام دسته‌بندی */}
              <span className="category-name">
                {category.name}
              </span>
            </button>
          ))}
      </div>
</section>


      {/* بنر تبلیغاتی */}
      <section className="menu-banner">
        <p>طعم اصیل، تجربه‌ای متفاوت</p>
        <h2>وقت یه غذای خوشمزه‌ست!</h2>
        <span>غذای مورد علاقه‌ات رو انتخاب کن.</span>
      </section>

      
      
      {/* بخش محصولات محبوب */}
      <section className="featured-products">
        {/* عنوان این بخش */}
        <h2 className="products-heading">محبوب‌ترین‌ها</h2>

        {/* اگر محصولی مطابق فیلتر وجود داشت، کارت‌هایش را نمایش بده */}
        {displayedProducts.length > 0 ? (
          displayedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={toggleFavorite}
              onOpenProduct={openProduct}
            />
          ))
        ) : (
          /* اگر محصولی نبود پیام مناسب نشون بده */
          <p className="empty-products">
            {activeTab === 'favorites'
            ? 'هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌ای.' 
            : searchText.trim() ? 'محصولی با این نام پیدا نشد.'
              : `در حال حاضر محصولی در دسته‌بندی «${selectedCategory}» موجود نیست.`}
          </p>
        )}
      </section>

       </>
      )}   


      {/* نوار پایین منو */}
      <nav className="menu-bottom-nav" aria-label="ناوبری منو">

        {/* خانه: نمایش منوی محصولات */}
        <button type="button" className={activeTab === 'menu' ? 'active' : ''}
        onClick={() => setActiveTab('menu')}
        >
          <img src={`${import.meta.env.BASE_URL}images/${activeTab === 'menu' ? 'home-orange.svg' : 'home.svg'}`} alt="" />          <span>خانه</span>  
        </button>

        {/* علاقه مندی ها: نمایش محصولات انتخاب شده */}
        <button type="button" className={activeTab === 'favorites' ? 'active' : ''}
        onClick={() => setActiveTab('favorites')}
        >
           <img src={`${import.meta.env.BASE_URL}images/${activeTab === 'favorites' ? 'favoritte0-orange.svg' : 'favorites0.svg'}`} alt="" />
          />
          <span>علاقه‌مندی‌ها</span>
        </button>

        {/* اطلاعات رستوران */}
        <button
          type="button"
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => setActiveTab('info')}
          >
            <img src={`${import.meta.env.BASE_URL}images/${activeTab === 'info' ? 'info-orange.svg' : 'info.svg'}`} alt="" />
            <span>اطلاعات رستوران</span>
        </button>
      </nav>
    </main>
  )
}


export default MenuPage
